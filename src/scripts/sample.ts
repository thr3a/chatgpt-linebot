export const WEATHER_CODES: { [key: number]: string } = {
  0: '晴れ',
  1: '大部分晴れ',
  2: '一部曇り',
  3: '曇り',
  45: '霧',
  48: '結露性霧',
  51: '小雨',
  53: '中程度の雨',
  55: '強い雨',
  56: '軽い凍雨',
  57: '強い凍雨',
  61: 'わずかな雨',
  63: '中程度の雨',
  65: '大雨',
  66: '軽い着氷性の雨',
  67: '激しい着氷性の雨',
  71: 'わずかな雪',
  73: '中程度の雪',
  75: '大雪',
  77: '雪片',
  80: '小雨のにわか雨',
  81: '中程度のにわか雨',
  82: '大雨のにわか雨',
  85: '小雪のにわか雪',
  86: '大雪のにわか雪',
  95: 'わずかから中程度の雷雨',
  96: 'ひょうの降る雷雨',
  99: '大ぶりのひょうを伴う雷雨'
};

const url = 'https://api.open-meteo.com/v1/forecast?latitude=35.64&longitude=139.70&daily=weathercode,temperature_2m_max&forecast_days=2&timezone=Asia%2FTokyo';
const response = await fetch(url);
const json = await response.json();
console.log(WEATHER_CODES[json.daily.weathercode[0]]);
console.log(json.daily.temperature_2m_max);
