// ============================================================
// 方案（Day 8 由用户自己写的）：
//   ① 当前温度和天气 + 未来几天预报
//   ② 用户自己搜索选择城市
//   ③ 穿衣建议 + 天气图标 + 背景随天气变化
// 新知识点：fetch（向别人的服务器要数据）、async/await（等数据回来）、
//          两次 API 串联、请求失败的兜底处理
// 数据源：Open-Meteo（免费、无需注册、无需 key）
// ============================================================

const $ = (id) => document.getElementById(id);

// WMO 天气代码 → 中文描述 + 图标 + 背景类（API 返回的是数字，翻译全靠这张表）
const WEATHER_CODES = {
  0:  { desc: "晴",           icon: "☀️",  bg: "sunny" },
  1:  { desc: "大致晴",       icon: "🌤️", bg: "sunny" },
  2:  { desc: "多云",         icon: "⛅",  bg: "cloudy" },
  3:  { desc: "阴",           icon: "☁️",  bg: "cloudy" },
  45: { desc: "雾",           icon: "🌫️", bg: "fog" },
  48: { desc: "雾凇",         icon: "🌫️", bg: "fog" },
  51: { desc: "毛毛雨",       icon: "🌦️", bg: "rain" },
  53: { desc: "毛毛雨",       icon: "🌦️", bg: "rain" },
  55: { desc: "浓毛毛雨",     icon: "🌦️", bg: "rain" },
  61: { desc: "小雨",         icon: "🌧️", bg: "rain" },
  63: { desc: "中雨",         icon: "🌧️", bg: "rain" },
  65: { desc: "大雨",         icon: "🌧️", bg: "rain" },
  66: { desc: "冻雨",         icon: "🌧️", bg: "rain" },
  67: { desc: "强冻雨",       icon: "🌧️", bg: "rain" },
  71: { desc: "小雪",         icon: "❄️",  bg: "snow" },
  73: { desc: "中雪",         icon: "❄️",  bg: "snow" },
  75: { desc: "大雪",         icon: "❄️",  bg: "snow" },
  77: { desc: "雪粒",         icon: "❄️",  bg: "snow" },
  80: { desc: "阵雨",         icon: "🌧️", bg: "rain" },
  81: { desc: "强阵雨",       icon: "🌧️", bg: "rain" },
  82: { desc: "暴雨",         icon: "🌧️", bg: "rain" },
  85: { desc: "阵雪",         icon: "❄️",  bg: "snow" },
  86: { desc: "强阵雪",       icon: "❄️",  bg: "snow" },
  95: { desc: "雷阵雨",       icon: "⛈️", bg: "storm" },
  96: { desc: "雷阵雨伴冰雹", icon: "⛈️", bg: "storm" },
  99: { desc: "强雷雨伴冰雹", icon: "⛈️", bg: "storm" },
};

function weatherOf(code) {
  return WEATHER_CODES[code] || { desc: "未知天气", icon: "🌈", bg: "cloudy" };
}

// 穿衣建议：按温度分档，雨雪天追加提醒
function clothingAdvice(temp, code) {
  let base;
  if (temp >= 28) base = "短袖短裤，注意防晒补水";
  else if (temp >= 20) base = "单衣或薄外套，体感舒适";
  else if (temp >= 10) base = "夹克或卫衣，早晚偏凉";
  else if (temp >= 0) base = "大衣或薄羽绒服，围巾可以安排";
  else base = "羽绒服全副武装，帽子手套都上";

  const isWet = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  const isSnow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  if (isWet) base += "；有雨，记得带伞 ☂️";
  if (isSnow) base += "；有雪，路滑慢行 🧊";
  return base;
}

// ===== 第 1 次请求：搜城市（拿候选列表和经纬度）=====
async function searchCity() {
  const name = $("city-input").value.trim();
  if (!name) {
    $("hint").className = "hint error";
    $("hint").textContent = "先输入城市名";
    return;
  }

  $("hint").className = "hint";
  $("hint").textContent = "搜索中…";
  $("city-list").innerHTML = "";

  try {
    // encodeURIComponent：把"北京"翻译成网址能安全携带的编码（复读题：不用会怎样？）
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(name) +
      "&count=5&language=zh&format=json";
    const res = await fetch(url);   // 出门要数据，await = 等它回来再往下走
    const data = await res.json();  // 回来的是字符串，解析成对象

    if (!data.results || data.results.length === 0) {
      $("hint").className = "hint error";
      $("hint").textContent = "没找到这个城市，换个名字试试";
      return;
    }
    $("hint").textContent = "找到 " + data.results.length + " 个，点一个：";

    data.results.forEach((city) => {
      const item = document.createElement("div");
      item.className = "city-item";
      item.innerHTML =
        city.name +
        (city.admin1 ? " <small>" + city.admin1 + "</small>" : "") +
        " <small>" + (city.country || "") + "</small>";
      item.addEventListener("click", () => loadWeather(city));
      $("city-list").appendChild(item);
    });
  } catch (err) {
    // 网络不通 / 接口挂了：页面不能白屏，给人话
    $("hint").className = "hint error";
    $("hint").textContent = "网络开小差了，稍后再试";
  }
}

// ===== 第 2 次请求：查天气（用上一步拿到的经纬度）=====
async function loadWeather(city) {
  $("city-name").textContent = city.name + " · 加载中…";
  $("city-list").innerHTML = "";
  $("hint").textContent = "";

  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + city.latitude +
      "&longitude=" + city.longitude +
      "&current=temperature_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=auto&forecast_days=6";
    const res = await fetch(url);
    const data = await res.json();

    // --- 当前天气 ---
    const now = data.current;
    const w = weatherOf(now.weather_code);
    document.body.className = "bg-" + w.bg;   // 背景随天气变
    $("city-name").textContent = city.name;
    $("now-icon").textContent = w.icon;
    $("now-temp").textContent = Math.round(now.temperature_2m) + "°";
    $("now-desc").textContent = w.desc;
    $("advice").textContent = "🧥 " + clothingAdvice(now.temperature_2m, now.weather_code);
    $("current-card").style.display = "block";

    // --- 未来几天预报 ---
    const daily = data.daily;
    const week = ["日", "一", "二", "三", "四", "五", "六"];
    $("forecast").innerHTML = daily.time
      .map((dateStr, i) => {
        const d = new Date(dateStr + "T00:00:00");
        const dw = weatherOf(daily.weather_code[i]);
        const label = i === 0 ? "今天" : "周" + week[d.getDay()];
        return (
          '<div class="day-card' + (i === 0 ? " today" : "") + '">' +
          '<p class="d-date">' + label + " " + (d.getMonth() + 1) + "/" + d.getDate() + "</p>" +
          '<p class="d-icon">' + dw.icon + "</p>" +
          '<p class="d-desc">' + dw.desc + "</p>" +
          '<p class="d-temp">' + Math.round(daily.temperature_2m_max[i]) + "°" +
          " <small>/ " + Math.round(daily.temperature_2m_min[i]) + "°</small></p>" +
          "</div>"
        );
      })
      .join("");
    $("forecast-card").style.display = "block";
  } catch (err) {
    $("city-name").textContent = "加载失败";
    $("hint").className = "hint error";
    $("hint").textContent = "天气数据没拿到，检查下网络再试";
  }
}

// ===== 事件绑定 =====
$("search-btn").addEventListener("click", searchCity);
$("city-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchCity();
});
