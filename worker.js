const BASE_URL = "https://xxx.com"; // one-api地址，结尾不要带斜杠/. new-api理论同样支持
const API_KEY = "xxx"; // 系统访问令牌, onw-api平台设置页生成
const TOKEN_CONF = [
  {
    "refreshToken": "xxx1", // refresh token
    "channelId": 1 // one-api平台对应的渠道id
  },
  {
    "refreshToken": "xxx2",  // 可以配置多个渠道
    "channelId": 2
  }
];

const KEY_LIST = "KEY_LIST"
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isForce = url.searchParams.get('force') === 'true';
    const res = await processRequest(env, isForce);
    return new Response(res);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processRequest(env, true));
  },
}

async function getAccessToken(refreshToken, keyList, isForce = false) {
  let target = keyList.find(item => item.refreshToken === refreshToken) || null
  if(!target) {
    target = JSON.parse(JSON.stringify(TOKEN_CONF));
    keyList.push(target);
  }
  let { expiresIn = 0, at = '' } = target;
  if (Date.now() < expiresIn && at && !isForce) {
    console.log('存在access token且未过期');
    return at;
  }
  console.log('获取新的access token');
  const response = await fetch('https://token.oaifree.com/api/auth/refresh', {
    method: 'POST',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: `refresh_token=${refreshToken}`
  });
  const resData = await response.json();
  // console.log('resData:', resData);
  let { access_token = null, expires_in = 0, detail = '' } = resData;
  if (detail?.includes('invalid_grant')) {
    throw Error('invalid refresh token.');
  }
  let newExpiresIn = Date.now() + expires_in * 1000 - 259200000; // Expires in seven days
  target.at = access_token
  target.expiresIn = newExpiresIn
  return access_token;
}

async function getChannelData(id) {
  const response = await fetch(`${BASE_URL}/api/channel/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const { success, data } = await response.json();
  if (success) return data;
  throw Error('one-key api key错误~');
}

async function setChannelData(obj) {
  const response = await fetch(`${BASE_URL}/api/channel`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(obj)
  });
  const result = await response.json();
  return result;
}

async function main(keyList, isForce) {
  let res = "", tips = ""
  for (const conf of TOKEN_CONF) {
    let { refreshToken, channelId } = conf;
    try {
      let at = await getAccessToken(refreshToken, keyList, isForce);
      let channelData = await getChannelData(channelId);
      let formatData = Object.assign({}, channelData, { key: at });
      await setChannelData(formatData);
      tips = `渠道${channelId}: ${formatData.name} key更新成功~\n`
      res += tips
      // console.log(tips);
    } catch (error) {
      tips = `渠道${channelId}:  key更新失败! 原因: ${error.message}`
      res += tips
      // console.error(tips);
    }
  }
  return { keyList, res }
}

async function processRequest(env, isForce) {
  let keyList = await env.ATKV.get(KEY_LIST, 'json');
  if (!Array.isArray(keyList) || !keyList[0]) keyList = JSON.parse(JSON.stringify(TOKEN_CONF));
  console.log('keyList:', keyList);
  let { keyList: newKeyList, res } = await main(keyList, isForce);
  await env.ATKV.put(KEY_LIST, JSON.stringify(newKeyList));
  return res;
}
