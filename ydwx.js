/*
------------------------------------------
@Author: ArcadiaScript
@Date: 2024-06-25
@Description: 一点万象签到
------------------------------------------
获取 Cookie：登录后在一点万象 App 中搜索 mixcapp 请求，定位 https://app.mixcapp.com/mixc/gateway，拦截签到请求体中的 deviceParams 与 token。


================ Loon 配置 ================
[MITM]
hostname = app.mixcapp.com

cron "17 8 * * *" script-path=https://raw.githubusercontent.com/zhenyuefu/scripts/main/ydwx.js, tag=一点万象签到

http-request ^https?:\/\/app\.mixcapp\.com\/mixc\/gateway script-path=https://raw.githubusercontent.com/zhenyuefu/scripts/main/ydwx.js, timeout=60, tag=一点万象获取Cookie

⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
*/
const $ = new Env("一点万象");
const ckName = "ydwx_data";
const userCookie =
  $.toObj($.isNode() ? process.env[ckName] : $.getdata(ckName)) || [];
//notify
const notify = $.isNode() ? require("./sendNotify") : "";
$.notifyMsg = [];
//debug
$.is_debug =
  ($.isNode() ? process.env.IS_DEDUG : $.getdata("is_debug")) || "false";
$.doFlag = { true: "✅", false: "⛔️" };
//------------------------------------------
const baseUrl = "";
const _headers = {};
const SIGN_CONST = {
  action: "mixc.app.memberSign.sign",
  apiVersion: "1.0",
  appId: "68a91a5bac6a4f3e91bf4b42856785c6",
  appVersion: "3.53.0",
  imei: "2333",
  mallNo: "20014",
  osVersion: "12.0.1",
  params: "eyJtYWxsTm8iOiIyMDAxNCJ9",
  platform: "h5",
  secret: "P@Gkbu0shTNHjhM!7F",
};

const DEFAULT_HEADERS = {
  Host: "app.mixcapp.com",
  Connection: "keep-alive",
  Accept: "application/json, text/plain, */*",
  Origin: "https://app.mixcapp.com",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; PCAM00 Build/QKQ1.190918.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.92 Mobile Safari/537.36/MIXCAPP/3.42.2/AnalysysAgent/Hybrid",
  "Sec-Fetch-Mode": "cors",
  "Content-Type": "application/x-www-form-urlencoded",
  "X-Requested-With": "com.crland.mixc",
  "Sec-Fetch-Site": "same-origin",
  Referer: "https://app.mixcapp.com/m/m-20014/signIn?showWebNavigation=true",
  "Accept-Encoding": "gzip, deflate",
  "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
};

//------------------------------------------
const fetch = async (o) => {
  try {
    if (typeof o === "string") o = { url: o };
    if (o?.url?.startsWith("/") || o?.url?.startsWith(":"))
      o.url = baseUrl + o.url;
    const res = await Request({
      ...o,
      headers: o.headers || _headers,
      url: o.url,
    });
    debug(
      res,
      o?.url?.replace(/\/+$/, "").substring(o?.url?.lastIndexOf("/") + 1),
    );
    if (res?.message?.match?.(/登录已过期|用户未登录/))
      throw new Error(`用户需要去登录`);
    return res;
  } catch (e) {
    $.ckStatus = false;
    $.log(`⛔️ 请求发起失败！${e}`);
  }
};

async function main() {
  if (!userCookie?.length) throw new Error("找不到可用的帐户");
  $.log(`⚙️ 发现 ${userCookie?.length ?? 0} 个帐户\n`);
  let index = 0;
  $.notifyMsg = [];
  for (const user of userCookie) {
    index += 1;
    $.log(`🚀 开始任务「${getAccountLabel(user, index)}」`);
    $.ckStatus = true;
    const { detail } = await signin(user, index);
    detail && $.notifyMsg.push(detail);
  }
  $.title = `共处理 ${userCookie.length} 个帐户`;
  await sendMsg($.notifyMsg.join("\n"));
}

async function signin(user, index) {
  try {
    if (!user.deviceParams || !user.token)
      throw new Error("缺少 deviceParams 或 token");
    const timestamp = `${Date.now()}`;
    const sign = generateSign(user, timestamp);
    const headers = buildHeaders(user);
    const body = {
      mallNo: user.mallNo || SIGN_CONST.mallNo,
      appId: SIGN_CONST.appId,
      platform: user.platform || SIGN_CONST.platform,
      imei: user.imei || SIGN_CONST.imei,
      appVersion: user.appVersion || SIGN_CONST.appVersion,
      osVersion: user.osVersion || SIGN_CONST.osVersion,
      action: SIGN_CONST.action,
      apiVersion: SIGN_CONST.apiVersion,
      timestamp,
      deviceParams: user.deviceParams,
      token: user.token,
      params: user.params || SIGN_CONST.params,
      sign,
    };
    const res = await fetch({
      url: "https://app.mixcapp.com/mixc/gateway",
      headers,
      type: "post",
      dataType: "form",
      body,
    });
    const message = res?.message || "未知返回";
    const successFlag = message.includes("成功") || message.includes("已签到");
    $.log(
      `${$.doFlag[successFlag]} ${getAccountLabel(user, index)} -> ${message}\n`,
    );
    const detail = successFlag
      ? `${getAccountLabel(user, index)}：${
          message.includes("成功") ? "签到成功" : message
        }`
      : `${getAccountLabel(user, index)}：签到失败（${message}）`;
    const summary = `${getAccountLabel(user, index)}：${message}`;
    return { summary, detail };
  } catch (e) {
    $.log(`⛔️ 签到失败！${e}\n`);
    const detail = `${getAccountLabel(user, index)}：签到异常（${e?.message || e}）`;
    return { detail, summary: detail };
  }
}

function generateSign(user, timestamp) {
  const raw = [
    `action=${SIGN_CONST.action}`,
    `apiVersion=${SIGN_CONST.apiVersion}`,
    `appId=${SIGN_CONST.appId}`,
    `appVersion=${user.appVersion || SIGN_CONST.appVersion}`,
    `deviceParams=${user.deviceParams}`,
    `imei=${user.imei || SIGN_CONST.imei}`,
    `mallNo=${user.mallNo || SIGN_CONST.mallNo}`,
    `osVersion=${user.osVersion || SIGN_CONST.osVersion}`,
    `params=${user.params || SIGN_CONST.params}`,
    `platform=${user.platform || SIGN_CONST.platform}`,
    `timestamp=${timestamp}`,
    `token=${user.token}`,
    SIGN_CONST.secret,
  ].join("&");
  if ($.isNode()) {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(raw).digest("hex");
  }
  if (typeof $ === "object" && typeof $.md5 === "function") {
    return $.md5(raw);
  }
  throw new Error("当前环境无法计算签名，请在 Node.js 环境运行");
}

function buildHeaders(user) {
  return {
    ...DEFAULT_HEADERS,
    ...(user.headers || {}),
    "User-Agent": user.userAgent || DEFAULT_HEADERS["User-Agent"],
    Referer: user.referer || DEFAULT_HEADERS.Referer,
    "Accept-Language": user.language || DEFAULT_HEADERS["Accept-Language"],
  };
}

function getAccountLabel(user, index) {
  return user?.userName ? `${user.userName}` : `账号${index}`;
}

function parseFormBody(body) {
  const result = {};
  if (!body) return result;
  for (const part of body.split("&")) {
    if (!part) continue;
    const idx = part.indexOf("=");
    const key = idx > -1 ? part.slice(0, idx) : part;
    const value = idx > -1 ? part.slice(idx + 1) : "";
    result[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return result;
}

async function getCookie() {
  if ($request && $request.method === "OPTIONS") return;
  const body = $request?.body;
  if (!body) throw new Error("获取 Cookie 失败，未找到请求体");
  const form = parseFormBody(body);
  const lowerForm = ObjectKeys2LowerCase(form);
  const deviceParams = lowerForm.deviceparams;
  const token = lowerForm.token;
  if (!deviceParams || !token)
    throw new Error("获取 Cookie 失败，未获取到 deviceParams 或 token");
  const newData = {
    userName: "微信用户",
    deviceParams,
    token,
    mallNo: lowerForm.mallno || SIGN_CONST.mallNo,
    imei: lowerForm.imei || SIGN_CONST.imei,
    appVersion: lowerForm.appversion || SIGN_CONST.appVersion,
    osVersion: lowerForm.osversion || SIGN_CONST.osVersion,
    params: lowerForm.params || SIGN_CONST.params,
    platform: lowerForm.platform || SIGN_CONST.platform,
  };
  const index = userCookie.findIndex((item) => item.token === newData.token);
  if (index !== -1) {
    userCookie[index] = { ...userCookie[index], ...newData };
  } else {
    userCookie.push(newData);
  }
  $.setjson(userCookie, ckName);
  $.msg($.name, `🎉 获取 Cookie 成功!`, `${newData.userName}`);
}

//主程序执行入口
!(async () => {
  if (typeof $request !== "undefined") {
    await getCookie();
  } else {
    await main();
  }
})()
  .catch((e) => {
    $.logErr(e), $.msg($.name, `⛔️ script run error!`, e.message || e);
  })
  .finally(async () => {
    $.done({ ok: 1 });
  });

/** ---------------------------------固定不动区域----------------------------------------- */
// biome-ignore format: allow compact one-line helper functions
async function sendMsg(a) { a && ($.isNode() ? await notify.sendNotify($.name, a) : $.msg($.name, $.title || "", a, { "media-url": $.avatar })) }
// biome-ignore format: allow compact one-line helper functions
function DoubleLog(o) { o && ($.log(`${o}`), $.notifyMsg.push(`${o}`)) }
// biome-ignore format: allow compact one-line helper functions
function debug(g, e = "debug") { "true" === $.is_debug && ($.log(`\n-----------${e}------------\n`), $.log("string" == typeof g ? g : $.toStr(g) || `debug error => t=${g}`), $.log(`\n-----------${e}------------\n`)) }
//From xream's ObjectKeys2LowerCase
// biome-ignore format: allow compact one-line helper functions
function ObjectKeys2LowerCase(obj) { return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])) }
//From sliverkiss's Request
// biome-ignore format: allow compact one-line helper functions
async function Request(t) { "string" == typeof t && (t = { url: t }); try { if (!t?.url) throw new Error("[发送请求] 缺少 url 参数"); let { url: o, type: e, headers: r = {}, body: s, params: a, dataType: n = "form", resultType: u = "data" } = t; const p = e ? e?.toLowerCase() : "body" in t ? "post" : "get", c = o.concat("post" === p ? "?" + $.queryStr(a) : ""), i = t.timeout ? $.isSurge() ? t.timeout / 1e3 : t.timeout : 1e4; "json" === n && (r["Content-Type"] = "application/json;charset=UTF-8"); const y = s && "form" == n ? $.queryStr(s) : $.toStr(s), l = { ...t, ...t?.opts ? t.opts : {}, url: c, headers: r, ..."post" === p && { body: y }, ..."get" === p && a && { params: a }, timeout: i }, m = $.http[p.toLowerCase()](l).then((t => "data" == u ? $.toObj(t.body) || t.body : $.toObj(t) || t)).catch((t => $.log(`❌请求发起失败！原因为：${t}`))); return Promise.race([new Promise(((t, o) => setTimeout((() => o("当前请求已超时")), i))), m]) } catch (t) { console.log(`❌请求发起失败！原因为：${t}`) } }
//From chavyleung's Env.js
// biome-ignore format: allow compact one-line helper functions
function Env(e,t){class s{constructor(e){this.env=e}send(e,t="GET"){e="string"==typeof e?{url:e}:e;let s=this.get;"POST"===t&&(s=this.post);const i=new Promise(((t,i)=>{s.call(this,e,((e,s,o)=>{e?i(e):t(s)}))}));return e.timeout?((e,t=1e3)=>Promise.race([e,new Promise(((e,s)=>{setTimeout((()=>{s(new Error("请求超时"))}),t)}))]))(i,e.timeout):i}get(e){return this.send.call(this.env,e)}post(e){return this.send.call(this.env,e,"POST")}}return new class{constructor(e,t){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=e,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,t),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(e,t=null){try{return JSON.parse(e)}catch{return t}}toStr(e,t=null,...s){try{return JSON.stringify(e,...s)}catch{return t}}getjson(e,t){let s=t;if(this.getdata(e))try{s=JSON.parse(this.getdata(e))}catch{}return s}setjson(e,t){try{return this.setdata(JSON.stringify(e),t)}catch{return!1}}getScript(e){return new Promise((t=>{this.get({url:e},((e,s,i)=>t(i)))}))}runScript(e,t){return new Promise((s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=t&&t.timeout?t.timeout:o;const[r,a]=i.split("@"),n={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:e,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},policy:"DIRECT",timeout:o};this.post(n,((e,t,i)=>s(i)))})).catch((e=>this.logErr(e)))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t);if(!s&&!i)return{};{const i=s?e:t;try{return JSON.parse(this.fs.readFileSync(i))}catch(e){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t),o=JSON.stringify(this.data);s?this.fs.writeFileSync(e,o):i?this.fs.writeFileSync(t,o):this.fs.writeFileSync(e,o)}}lodash_get(e,t,s){const i=t.replace(/\[(\d+)\]/g,".$1").split(".");let o=e;for(const e of i)if(o=Object(o)[e],void 0===o)return s;return o}lodash_set(e,t,s){return Object(e)!==e||(Array.isArray(t)||(t=t.toString().match(/[^.[\]]+/g)||[]),t.slice(0,-1).reduce(((e,s,i)=>Object(e[s])===e[s]?e[s]:e[s]=Math.abs(t[i+1])>>0==+t[i+1]?[]:{}),e)[t[t.length-1]]=s),e}getdata(e){let t=this.getval(e);if(/^@/.test(e)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(e),o=s?this.getval(s):"";if(o)try{const e=JSON.parse(o);t=e?this.lodash_get(e,i,""):t}catch(e){t=""}}return t}setdata(e,t){let s=!1;if(/^@/.test(t)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(t),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const t=JSON.parse(a);this.lodash_set(t,o,e),s=this.setval(JSON.stringify(t),i)}catch(t){const r={};this.lodash_set(r,o,e),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(e,t);return s}getval(e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(e);case"Quantumult X":return $prefs.valueForKey(e);case"Node.js":return this.data=this.loaddata(),this.data[e];default:return this.data&&this.data[e]||null}}setval(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(e,t);case"Quantumult X":return $prefs.setValueForKey(e,t);case"Node.js":return this.data=this.loaddata(),this.data[t]=e,this.writedata(),!0;default:return this.data&&this.data[t]||null}}initGotEnv(e){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,e&&(e.headers=e.headers?e.headers:{},e&&(e.headers=e.headers?e.headers:{},void 0===e.headers.cookie&&void 0===e.headers.Cookie&&void 0===e.cookieJar&&(e.cookieJar=this.ckjar)))}get(e,t=(()=>{})){switch(e.headers&&(delete e.headers["Content-Type"],delete e.headers["Content-Length"],delete e.headers["content-type"],delete e.headers["content-length"]),e.params&&(e.url+="?"+this.queryStr(e.params)),void 0===e.followRedirect||e.followRedirect||((this.isSurge()||this.isLoon())&&(e["auto-redirect"]=!1),this.isQuanX()&&(e.opts?e.opts.redirection=!1:e.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(e.headers=e.headers||{},Object.assign(e.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(e,((e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)}));break;case"Quantumult X":this.isNeedRewrite&&(e.opts=e.opts||{},Object.assign(e.opts,{hints:!1})),$task.fetch(e).then((e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(e=>t(e&&e.error||"UndefinedError")));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(e),this.got(e).on("redirect",((e,t)=>{try{if(e.headers["set-cookie"]){const s=e.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),t.cookieJar=this.ckjar}}catch(e){this.logErr(e)}})).then((e=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=e,n=s.decode(a,this.encoding);t(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)}),(e=>{const{message:i,response:o}=e;t(i,o,o&&s.decode(o.rawBody,this.encoding))}));break}}post(e,t=(()=>{})){const s=e.method?e.method.toLocaleLowerCase():"post";switch(e.body&&e.headers&&!e.headers["Content-Type"]&&!e.headers["content-type"]&&(e.headers["content-type"]="application/x-www-form-urlencoded"),e.headers&&(delete e.headers["Content-Length"],delete e.headers["content-length"]),void 0===e.followRedirect||e.followRedirect||((this.isSurge()||this.isLoon())&&(e["auto-redirect"]=!1),this.isQuanX()&&(e.opts?e.opts.redirection=!1:e.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(e.headers=e.headers||{},Object.assign(e.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](e,((e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)}));break;case"Quantumult X":e.method=s,this.isNeedRewrite&&(e.opts=e.opts||{},Object.assign(e.opts,{hints:!1})),$task.fetch(e).then((e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(e=>t(e&&e.error||"UndefinedError")));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(e);const{url:o,...r}=e;this.got[s](o,r).then((e=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=e,n=i.decode(a,this.encoding);t(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)}),(e=>{const{message:s,response:o}=e;t(s,o,o&&i.decode(o.rawBody,this.encoding))}));break}}time(e,t=null){const s=t?new Date(t):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(e)&&(e=e.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let t in i)new RegExp("("+t+")").test(e)&&(e=e.replace(RegExp.$1,1==RegExp.$1.length?i[t]:("00"+i[t]).substr((""+i[t]).length)));return e}queryStr(e){let t="";for(const s in e){let i=e[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),t+=`${s}=${i}&`)}return t=t.substring(0,t.length-1),t}msg(t=e,s="",i="",o={}){const r=e=>{const{$open:t,$copy:s,$media:i,$mediaMime:o}=e;switch(typeof e){case void 0:return e;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:e};case"Loon":case"Shadowrocket":return e;case"Quantumult X":return{"open-url":e};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{const r={};let a=e.openUrl||e.url||e["open-url"]||t;a&&Object.assign(r,{action:"open-url",url:a});let n=e["update-pasteboard"]||e.updatePasteboard||s;n&&Object.assign(r,{action:"clipboard",text:n});let h=e.mediaUrl||e["media-url"]||i;if(h){let e,t;if(h.startsWith("http"));else if(h.startsWith("data:")){const[s]=h.split(";"),[,i]=h.split(",");e=i,t=s.replace("data:","")}else{e=h,t=(e=>{const t={JVBERi0:"application/pdf",R0lGODdh:"image/gif",R0lGODlh:"image/gif",iVBORw0KGgo:"image/png","/9j/":"image/jpg"};for(var s in t)if(0===e.indexOf(s))return t[s];return null})(h)}Object.assign(r,{"media-url":h,"media-base64":e,"media-base64-mime":o??t})}return Object.assign(r,{"auto-dismiss":e["auto-dismiss"],sound:e.sound}),r}case"Loon":{const s={};let o=e.openUrl||e.url||e["open-url"]||t;o&&Object.assign(s,{openUrl:o});let r=e.mediaUrl||e["media-url"]||i;return r&&Object.assign(s,{mediaUrl:r}),console.log(JSON.stringify(s)),s}case"Quantumult X":{const o={};let r=e["open-url"]||e.url||e.openUrl||t;r&&Object.assign(o,{"open-url":r});let a=e.mediaUrl||e["media-url"]||i;a&&Object.assign(o,{"media-url":a});let n=e["update-pasteboard"]||e.updatePasteboard||s;return n&&Object.assign(o,{"update-pasteboard":n}),console.log(JSON.stringify(o)),o}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(t,s,i,r(o));break;case"Quantumult X":$notify(t,s,i,r(o));break;case"Node.js":break}if(!this.isMuteLog){let e=["","==============📣系统通知📣=============="];e.push(t),s&&e.push(s),i&&e.push(i),console.log(e.join("\n")),this.logs=this.logs.concat(e)}}debug(...e){this.logLevels[this.logLevel]<=this.logLevels.debug&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.debug}${e.map((e=>e??String(e))).join(this.logSeparator)}`))}info(...e){this.logLevels[this.logLevel]<=this.logLevels.info&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.info}${e.map((e=>e??String(e))).join(this.logSeparator)}`))}warn(...e){this.logLevels[this.logLevel]<=this.logLevels.warn&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.warn}${e.map((e=>e??String(e))).join(this.logSeparator)}`))}error(...e){this.logLevels[this.logLevel]<=this.logLevels.error&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.error}${e.map((e=>e??String(e))).join(this.logSeparator)}`))}log(...e){e.length>0&&(this.logs=[...this.logs,...e]),console.log(e.map((e=>e??String(e))).join(this.logSeparator))}logErr(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t,e);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t,void 0!==e.message?e.message:e,e.stack);break}}wait(e){return new Promise((t=>setTimeout(t,e)))}done(e={}){const t=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${t} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(e);break;case"Node.js":process.exit(1)}}}(e,t)}
