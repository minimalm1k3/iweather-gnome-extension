import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import Soup from 'gi://Soup';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {WeatherGaussianBackdrop, loadOptionalBlurModule} from './weather-gaussian-blur.js';
import {createWeatherIcon} from './weather-icons.js';

const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const GEO_API = 'https://ipinfo.io/json';
const FALLBACK_LOCATION = {lat: 56.35, lon: 43.87, name: 'Home'};
const DEFAULT_LANGUAGE = 'en';

const LANGUAGE_OPTIONS = [
    {code: 'ru', locale: 'ru-RU', label: 'Русский'},
    {code: 'en', locale: 'en-US', label: 'English'},
    {code: 'de', locale: 'de-DE', label: 'Deutsch'},
    {code: 'fr', locale: 'fr-FR', label: 'Français'},
    {code: 'es', locale: 'es-ES', label: 'Español'},
    {code: 'it', locale: 'it-IT', label: 'Italiano'},
    {code: 'pt', locale: 'pt-BR', label: 'Português'},
    {code: 'pl', locale: 'pl-PL', label: 'Polski'},
    {code: 'uk', locale: 'uk-UA', label: 'Українська'},
    {code: 'tr', locale: 'tr-TR', label: 'Türkçe — Ai перевод'},
    {code: 'ar', locale: 'ar', label: 'العربية — Ai перевод'},
    {code: 'hi', locale: 'hi-IN', label: 'हिन्दी — Ai перевод'},
    {code: 'zh', locale: 'zh-CN', label: '中文 — Ai перевод'},
    {code: 'ja', locale: 'ja-JP', label: '日本語 — Ai перевод'},
    {code: 'ko', locale: 'ko-KR', label: '한국어 — Ai перевод'},
    {code: 'vi', locale: 'vi-VN', label: 'Tiếng Việt — Ai перевод'},
    {code: 'id', locale: 'id-ID', label: 'Bahasa Indonesia — Ai перевод'},
    {code: 'th', locale: 'th-TH', label: 'ไทย — Ai перевод'},
];
const LANGUAGE_META = Object.fromEntries(LANGUAGE_OPTIONS.map(option => [option.code, option]));

const TEXT = {
    ru: {hourly: 'СЕГОДНЯ — ПОЧАСОВОЙ ПРОГНОЗ', daily: 'ПРОГНОЗ НА 10 ДНЕЙ', today: 'Сегодня', now: 'Сейчас', max: 'Макс.', min: 'Мин.', settings: 'Открыть настройки', updated: 'Обновлено сейчас', loading: 'Обновление прогноза…', error: 'Не удалось обновить прогноз', unavailable: 'Нет данных', refresh: 'Обновить прогноз', wallet: 'Кошелёк', walletTitle: 'Поблагодарить', walletHint: 'Выберите валюту и сеть, затем нажмите на адрес, чтобы скопировать его.', copyAddress: 'Скопировать адрес', copied: 'Скопировано', previous: 'Предыдущие часы', next: 'Следующие часы', wind: 'м/с', uv: 'УФ', conditions: {clear: 'Ясно', partly: 'Переменная облачность', cloudy: 'Пасмурно', drizzle: 'Морось', rain: 'Дождь', 'heavy-rain': 'Ливень', 'freezing-rain': 'Ледяной дождь', snow: 'Снег', 'heavy-snow': 'Метель', fog: 'Туман', storm: 'Гроза'}, shortConditions: {clear: 'Ясно', partly: 'Облачно', cloudy: 'Пасмурно', drizzle: 'Морось', rain: 'Дождь', 'heavy-rain': 'Ливень', 'freezing-rain': 'Лёд', snow: 'Снег', 'heavy-snow': 'Метель', fog: 'Туман', storm: 'Гроза'}},
    en: {hourly: 'TODAY — HOURLY FORECAST', daily: '10-DAY FORECAST', today: 'Today', now: 'Now', max: 'Max.', min: 'Min.', settings: 'Open settings', updated: 'Updated just now', loading: 'Updating forecast…', error: 'Could not update forecast', unavailable: 'No data', refresh: 'Refresh forecast', wallet: 'Wallet', walletTitle: 'Say thank you', walletHint: 'Choose a currency and network, then click the address to copy it.', copyAddress: 'Copy address', copied: 'Copied', previous: 'Previous hours', next: 'Next hours', wind: 'm/s', uv: 'UV', conditions: {clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Overcast', drizzle: 'Drizzle', rain: 'Rain', 'heavy-rain': 'Heavy rain', 'freezing-rain': 'Freezing rain', snow: 'Snow', 'heavy-snow': 'Heavy snow', fog: 'Fog', storm: 'Storm'}},
    de: {hourly: 'HEUTE — STÜNDLICHE VORHERSAGE', daily: '10-TAGE-VORHERSAGE', today: 'Heute', now: 'Jetzt', max: 'Max.', min: 'Min.', settings: 'Einstellungen öffnen', updated: 'Gerade aktualisiert', loading: 'Vorhersage wird aktualisiert…', error: 'Vorhersage konnte nicht aktualisiert werden', unavailable: 'Keine Daten', refresh: 'Vorhersage aktualisieren', wallet: 'Wallet', walletTitle: 'Danke sagen', walletHint: 'Währung und Netzwerk auswählen, dann zum Kopieren auf die Adresse klicken.', copyAddress: 'Adresse kopieren', copied: 'Kopiert', previous: 'Vorherige Stunden', next: 'Nächste Stunden', wind: 'm/s', uv: 'UV', conditions: {clear: 'Klar', partly: 'Teilweise bewölkt', cloudy: 'Bedeckt', drizzle: 'Nieselregen', rain: 'Regen', 'heavy-rain': 'Starkregen', 'freezing-rain': 'Eisregen', snow: 'Schnee', 'heavy-snow': 'Schneesturm', fog: 'Nebel', storm: 'Gewitter'}},
    fr: {hourly: 'AUJOURD’HUI — PRÉVISIONS HORAIRES', daily: 'PRÉVISIONS SUR 10 JOURS', today: 'Aujourd’hui', now: 'Maintenant', max: 'Max.', min: 'Min.', settings: 'Ouvrir les paramètres', updated: 'Mis à jour à l’instant', loading: 'Mise à jour des prévisions…', error: 'Impossible de mettre à jour les prévisions', unavailable: 'Aucune donnée', refresh: 'Actualiser les prévisions', wallet: 'Portefeuille', walletTitle: 'Remercier', walletHint: 'Choisissez une devise et un réseau, puis cliquez sur l’adresse pour la copier.', copyAddress: 'Copier l’adresse', copied: 'Copié', previous: 'Heures précédentes', next: 'Heures suivantes', wind: 'm/s', uv: 'UV', conditions: {clear: 'Dégagé', partly: 'Partiellement nuageux', cloudy: 'Couvert', drizzle: 'Bruine', rain: 'Pluie', 'heavy-rain': 'Forte pluie', 'freezing-rain': 'Pluie verglaçante', snow: 'Neige', 'heavy-snow': 'Tempête de neige', fog: 'Brouillard', storm: 'Orage'}},
    es: {hourly: 'HOY — PRONÓSTICO POR HORAS', daily: 'PRONÓSTICO DE 10 DÍAS', today: 'Hoy', now: 'Ahora', max: 'Máx.', min: 'Mín.', settings: 'Abrir ajustes', updated: 'Actualizado ahora', loading: 'Actualizando el pronóstico…', error: 'No se pudo actualizar el pronóstico', unavailable: 'Sin datos', refresh: 'Actualizar pronóstico', wallet: 'Billetera', walletTitle: 'Agradecer', walletHint: 'Elige una moneda y una red, y pulsa la dirección para copiarla.', copyAddress: 'Copiar dirección', copied: 'Copiado', previous: 'Horas anteriores', next: 'Horas siguientes', wind: 'm/s', uv: 'UV', conditions: {clear: 'Despejado', partly: 'Parcialmente nublado', cloudy: 'Cubierto', drizzle: 'Llovizna', rain: 'Lluvia', 'heavy-rain': 'Lluvia intensa', 'freezing-rain': 'Lluvia helada', snow: 'Nieve', 'heavy-snow': 'Ventisca', fog: 'Niebla', storm: 'Tormenta'}},
    it: {hourly: 'OGGI — PREVISIONI ORARIE', daily: 'PREVISIONI A 10 GIORNI', today: 'Oggi', now: 'Ora', max: 'Max.', min: 'Min.', settings: 'Apri impostazioni', updated: 'Aggiornato ora', loading: 'Aggiornamento previsioni…', error: 'Impossibile aggiornare le previsioni', unavailable: 'Nessun dato', refresh: 'Aggiorna previsioni', wallet: 'Portafoglio', walletTitle: 'Ringrazia', walletHint: 'Scegli una valuta e una rete, poi fai clic sull’indirizzo per copiarlo.', copyAddress: 'Copia indirizzo', copied: 'Copiato', previous: 'Ore precedenti', next: 'Ore successive', wind: 'm/s', uv: 'UV', conditions: {clear: 'Sereno', partly: 'Parzialmente nuvoloso', cloudy: 'Coperto', drizzle: 'Pioviggine', rain: 'Pioggia', 'heavy-rain': 'Pioggia forte', 'freezing-rain': 'Pioggia gelata', snow: 'Neve', 'heavy-snow': 'Bufera di neve', fog: 'Nebbia', storm: 'Temporale'}},
    pt: {hourly: 'HOJE — PREVISÃO POR HORA', daily: 'PREVISÃO PARA 10 DIAS', today: 'Hoje', now: 'Agora', max: 'Máx.', min: 'Mín.', settings: 'Abrir configurações', updated: 'Atualizado agora', loading: 'Atualizando previsão…', error: 'Não foi possível atualizar a previsão', unavailable: 'Sem dados', refresh: 'Atualizar previsão', wallet: 'Carteira', walletTitle: 'Agradecer', walletHint: 'Escolha uma moeda e uma rede e clique no endereço para copiá-lo.', copyAddress: 'Copiar endereço', copied: 'Copiado', previous: 'Horas anteriores', next: 'Próximas horas', wind: 'm/s', uv: 'UV', conditions: {clear: 'Limpo', partly: 'Parcialmente nublado', cloudy: 'Encoberto', drizzle: 'Garoa', rain: 'Chuva', 'heavy-rain': 'Chuva forte', 'freezing-rain': 'Chuva congelante', snow: 'Neve', 'heavy-snow': 'Nevasca', fog: 'Nevoeiro', storm: 'Tempestade'}},
    pl: {hourly: 'DZISIAJ — PROGNOZA GODZINOWA', daily: 'PROGNOZA NA 10 DNI', today: 'Dzisiaj', now: 'Teraz', max: 'Maks.', min: 'Min.', settings: 'Otwórz ustawienia', updated: 'Właśnie zaktualizowano', loading: 'Aktualizowanie prognozy…', error: 'Nie udało się zaktualizować prognozy', unavailable: 'Brak danych', refresh: 'Odśwież prognozę', wallet: 'Portfel', walletTitle: 'Podziękuj', walletHint: 'Wybierz walutę i sieć, a następnie kliknij adres, aby go skopiować.', copyAddress: 'Kopiuj adres', copied: 'Skopiowano', previous: 'Poprzednie godziny', next: 'Następne godziny', wind: 'm/s', uv: 'UV', conditions: {clear: 'Bezchmurnie', partly: 'Częściowe zachmurzenie', cloudy: 'Pochmurno', drizzle: 'Mżawka', rain: 'Deszcz', 'heavy-rain': 'Ulewa', 'freezing-rain': 'Marznący deszcz', snow: 'Śnieg', 'heavy-snow': 'Śnieżyca', fog: 'Mgła', storm: 'Burza'}},
    uk: {hourly: 'СЬОГОДНІ — ПОГОДИННИЙ ПРОГНОЗ', daily: 'ПРОГНОЗ НА 10 ДНІВ', today: 'Сьогодні', now: 'Зараз', max: 'Макс.', min: 'Мін.', settings: 'Відкрити налаштування', updated: 'Щойно оновлено', loading: 'Оновлення прогнозу…', error: 'Не вдалося оновити прогноз', unavailable: 'Немає даних', refresh: 'Оновити прогноз', wallet: 'Гаманець', walletTitle: 'Подякувати', walletHint: 'Виберіть валюту й мережу, потім натисніть адресу, щоб скопіювати її.', copyAddress: 'Скопіювати адресу', copied: 'Скопійовано', previous: 'Попередні години', next: 'Наступні години', wind: 'м/с', uv: 'УФ', conditions: {clear: 'Ясно', partly: 'Мінлива хмарність', cloudy: 'Хмарно', drizzle: 'Мряка', rain: 'Дощ', 'heavy-rain': 'Злива', 'freezing-rain': 'Крижаний дощ', snow: 'Сніг', 'heavy-snow': 'Хуртовина', fog: 'Туман', storm: 'Гроза'}},
    tr: {hourly: 'BUGÜN — SAATLİK TAHMİN', daily: '10 GÜNLÜK TAHMİN', today: 'Bugün', now: 'Şimdi', max: 'Maks.', min: 'Min.', settings: 'Ayarları aç', updated: 'Şimdi güncellendi', loading: 'Tahmin güncelleniyor…', error: 'Tahmin güncellenemedi', unavailable: 'Veri yok', refresh: 'Tahmini yenile', wallet: 'Cüzdan', walletTitle: 'Teşekkür et', walletHint: 'Bir para birimi ve ağ seçin, ardından kopyalamak için adrese tıklayın.', copyAddress: 'Adresi kopyala', copied: 'Kopyalandı', previous: 'Önceki saatler', next: 'Sonraki saatler', wind: 'm/sn', uv: 'UV', conditions: {clear: 'Açık', partly: 'Parçalı bulutlu', cloudy: 'Kapalı', drizzle: 'Çiseleme', rain: 'Yağmur', 'heavy-rain': 'Şiddetli yağmur', 'freezing-rain': 'Dondurucu yağmur', snow: 'Kar', 'heavy-snow': 'Kar fırtınası', fog: 'Sis', storm: 'Fırtına'}},
    ar: {hourly: 'اليوم — توقعات كل ساعة', daily: 'توقعات 10 أيام', today: 'اليوم', now: 'الآن', max: 'العظمى', min: 'الصغرى', settings: 'فتح الإعدادات', updated: 'تم التحديث الآن', loading: 'جارٍ تحديث التوقعات…', error: 'تعذر تحديث التوقعات', unavailable: 'لا توجد بيانات', refresh: 'تحديث التوقعات', wallet: 'المحفظة', walletTitle: 'شكرًا', walletHint: 'اختر العملة والشبكة، ثم انقر على العنوان لنسخه.', copyAddress: 'نسخ العنوان', copied: 'تم النسخ', previous: 'الساعات السابقة', next: 'الساعات التالية', wind: 'م/ث', uv: 'UV', conditions: {clear: 'صحو', partly: 'غائم جزئيًا', cloudy: 'غائم', drizzle: 'رذاذ', rain: 'مطر', 'heavy-rain': 'مطر غزير', 'freezing-rain': 'مطر متجمد', snow: 'ثلج', 'heavy-snow': 'عاصفة ثلجية', fog: 'ضباب', storm: 'عاصفة رعدية'}},
    hi: {hourly: 'आज — प्रति घंटे का पूर्वानुमान', daily: '10-दिन का पूर्वानुमान', today: 'आज', now: 'अभी', max: 'अधिकतम', min: 'न्यूनतम', settings: 'सेटिंग खोलें', updated: 'अभी अपडेट किया गया', loading: 'पूर्वानुमान अपडेट हो रहा है…', error: 'पूर्वानुमान अपडेट नहीं हुआ', unavailable: 'डेटा नहीं', refresh: 'पूर्वानुमान अपडेट करें', wallet: 'वॉलेट', walletTitle: 'धन्यवाद दें', walletHint: 'मुद्रा और नेटवर्क चुनें, फिर पता कॉपी करने के लिए उस पर क्लिक करें।', copyAddress: 'पता कॉपी करें', copied: 'कॉपी किया गया', previous: 'पिछले घंटे', next: 'अगले घंटे', wind: 'मी/से', uv: 'UV', conditions: {clear: 'साफ़', partly: 'आंशिक बादल', cloudy: 'बादल', drizzle: 'फुहार', rain: 'बारिश', 'heavy-rain': 'तेज़ बारिश', 'freezing-rain': 'जमी हुई बारिश', snow: 'बर्फ़', 'heavy-snow': 'बर्फ़ीला तूफ़ान', fog: 'कोहरा', storm: 'तूफ़ान'}},
    zh: {hourly: '今天 — 每小时预报', daily: '10 天预报', today: '今天', now: '现在', max: '最高', min: '最低', settings: '打开设置', updated: '刚刚更新', loading: '正在更新预报…', error: '无法更新预报', unavailable: '无数据', refresh: '刷新预报', wallet: '钱包', walletTitle: '感谢', walletHint: '选择币种和网络，然后点击地址进行复制。', copyAddress: '复制地址', copied: '已复制', previous: '前几小时', next: '后几小时', wind: '米/秒', uv: '紫外线', conditions: {clear: '晴', partly: '局部多云', cloudy: '阴', drizzle: '毛毛雨', rain: '雨', 'heavy-rain': '大雨', 'freezing-rain': '冻雨', snow: '雪', 'heavy-snow': '暴雪', fog: '雾', storm: '雷暴'}},
    ja: {hourly: '今日 — 1時間ごとの予報', daily: '10日間予報', today: '今日', now: '現在', max: '最高', min: '最低', settings: '設定を開く', updated: '更新済み', loading: '予報を更新中…', error: '予報を更新できませんでした', unavailable: 'データなし', refresh: '予報を更新', wallet: 'ウォレット', walletTitle: '感謝する', walletHint: '通貨とネットワークを選び、アドレスをクリックしてコピーします。', copyAddress: 'アドレスをコピー', copied: 'コピー済み', previous: '前の時間', next: '次の時間', wind: 'm/s', uv: 'UV', conditions: {clear: '晴れ', partly: '一部曇り', cloudy: '曇り', drizzle: '霧雨', rain: '雨', 'heavy-rain': '大雨', 'freezing-rain': '凍雨', snow: '雪', 'heavy-snow': '吹雪', fog: '霧', storm: '雷雨'}},
    ko: {hourly: '오늘 — 시간별 예보', daily: '10일 예보', today: '오늘', now: '현재', max: '최고', min: '최저', settings: '설정 열기', updated: '방금 업데이트됨', loading: '예보 업데이트 중…', error: '예보를 업데이트할 수 없음', unavailable: '데이터 없음', refresh: '예보 새로고침', wallet: '지갑', walletTitle: '감사하기', walletHint: '통화와 네트워크를 선택한 다음 주소를 클릭하여 복사하세요.', copyAddress: '주소 복사', copied: '복사됨', previous: '이전 시간', next: '다음 시간', wind: 'm/s', uv: 'UV', conditions: {clear: '맑음', partly: '부분적으로 흐림', cloudy: '흐림', drizzle: '이슬비', rain: '비', 'heavy-rain': '폭우', 'freezing-rain': '어는 비', snow: '눈', 'heavy-snow': '눈보라', fog: '안개', storm: '뇌우'}},
    vi: {hourly: 'HÔM NAY — DỰ BÁO THEO GIỜ', daily: 'DỰ BÁO 10 NGÀY', today: 'Hôm nay', now: 'Bây giờ', max: 'Cao nhất', min: 'Thấp nhất', settings: 'Mở cài đặt', updated: 'Vừa cập nhật', loading: 'Đang cập nhật dự báo…', error: 'Không thể cập nhật dự báo', unavailable: 'Không có dữ liệu', refresh: 'Làm mới dự báo', wallet: 'Ví', walletTitle: 'Cảm ơn', walletHint: 'Chọn loại tiền và mạng, sau đó nhấp vào địa chỉ để sao chép.', copyAddress: 'Sao chép địa chỉ', copied: 'Đã sao chép', previous: 'Giờ trước', next: 'Giờ tiếp theo', wind: 'm/s', uv: 'UV', conditions: {clear: 'Trời quang', partly: 'Ít mây', cloudy: 'Nhiều mây', drizzle: 'Mưa phùn', rain: 'Mưa', 'heavy-rain': 'Mưa lớn', 'freezing-rain': 'Mưa đóng băng', snow: 'Tuyết', 'heavy-snow': 'Bão tuyết', fog: 'Sương mù', storm: 'Dông'}},
    id: {hourly: 'HARI INI — PRAKIRAAN PER JAM', daily: 'PRAKIRAAN 10 HARI', today: 'Hari ini', now: 'Sekarang', max: 'Maks.', min: 'Min.', settings: 'Buka pengaturan', updated: 'Baru diperbarui', loading: 'Memperbarui prakiraan…', error: 'Prakiraan tidak dapat diperbarui', unavailable: 'Tidak ada data', refresh: 'Segarkan prakiraan', wallet: 'Dompet', walletTitle: 'Berterima kasih', walletHint: 'Pilih mata uang dan jaringan, lalu klik alamat untuk menyalinnya.', copyAddress: 'Salin alamat', copied: 'Disalin', previous: 'Jam sebelumnya', next: 'Jam berikutnya', wind: 'm/dtk', uv: 'UV', conditions: {clear: 'Cerah', partly: 'Berawan sebagian', cloudy: 'Mendung', drizzle: 'Gerimis', rain: 'Hujan', 'heavy-rain': 'Hujan lebat', 'freezing-rain': 'Hujan beku', snow: 'Salju', 'heavy-snow': 'Badai salju', fog: 'Kabut', storm: 'Badai petir'}},
    th: {hourly: 'วันนี้ — พยากรณ์รายชั่วโมง', daily: 'พยากรณ์ 10 วัน', today: 'วันนี้', now: 'ตอนนี้', max: 'สูงสุด', min: 'ต่ำสุด', settings: 'เปิดการตั้งค่า', updated: 'อัปเดตแล้ว', loading: 'กำลังอัปเดตพยากรณ์…', error: 'ไม่สามารถอัปเดตพยากรณ์ได้', unavailable: 'ไม่มีข้อมูล', refresh: 'รีเฟรชพยากรณ์', wallet: 'กระเป๋าเงิน', walletTitle: 'ขอบคุณ', walletHint: 'เลือกสกุลเงินและเครือข่าย แล้วคลิกที่อยู่เพื่อคัดลอก', copyAddress: 'คัดลอกที่อยู่', copied: 'คัดลอกแล้ว', previous: 'ชั่วโมงก่อนหน้า', next: 'ชั่วโมงถัดไป', wind: 'ม./วินาที', uv: 'UV', conditions: {clear: 'ท้องฟ้าแจ่มใส', partly: 'มีเมฆบางส่วน', cloudy: 'มีเมฆมาก', drizzle: 'ฝนปรอย', rain: 'ฝน', 'heavy-rain': 'ฝนตกหนัก', 'freezing-rain': 'ฝนเยือกแข็ง', snow: 'หิมะ', 'heavy-snow': 'พายุหิมะ', fog: 'หมอก', storm: 'พายุฝนฟ้าคะนอง'}},
};

const ICONS = {
    0: 'weather-clear-symbolic', 1: 'weather-few-clouds-symbolic', 2: 'weather-few-clouds-symbolic', 3: 'weather-overcast-symbolic',
    45: 'weather-fog-symbolic', 48: 'weather-fog-symbolic', 51: 'weather-showers-scattered-symbolic', 53: 'weather-showers-scattered-symbolic',
    55: 'weather-showers-scattered-symbolic', 56: 'weather-snow-symbolic', 57: 'weather-snow-symbolic', 61: 'weather-showers-symbolic',
    63: 'weather-showers-symbolic', 65: 'weather-showers-symbolic', 66: 'weather-snow-symbolic', 67: 'weather-snow-symbolic',
    71: 'weather-snow-symbolic', 73: 'weather-snow-symbolic', 75: 'weather-snow-symbolic', 77: 'weather-snow-symbolic',
    80: 'weather-showers-scattered-symbolic', 81: 'weather-showers-symbolic', 82: 'weather-showers-symbolic', 85: 'weather-snow-symbolic',
    86: 'weather-snow-symbolic', 95: 'weather-storm-symbolic', 96: 'weather-storm-symbolic', 99: 'weather-storm-symbolic',
};

// Weather artwork is exported from the Weather Icons library in Figma and
// bundled locally so the widget remains usable offline. The crypto artwork in
// assets/wallet is intentionally kept as a separate user-provided set.
const WEATHER_ICON_FILES = {
    clear: {day: 'weather-icons-figma/clear.png', night: 'weather-icons-figma/clear-night.png'},
    partly: {day: 'weather-icons-figma/partly.png', night: 'weather-icons-figma/partly.png'},
    cloudy: {day: 'weather-icons-figma/cloudy.png', night: 'weather-icons-figma/cloudy.png'},
    drizzle: {day: 'weather-icons-figma/drizzle.png', night: 'weather-icons-figma/drizzle.png'},
    rain: {day: 'weather-icons-figma/rain.png', night: 'weather-icons-figma/rain.png'},
    'heavy-rain': {day: 'weather-icons-figma/rain.png', night: 'weather-icons-figma/rain.png'},
    'freezing-rain': {day: 'weather-icons-figma/rain.png', night: 'weather-icons-figma/rain.png'},
    snow: {day: 'weather-icons-figma/snow.png', night: 'weather-icons-figma/snow.png'},
    'heavy-snow': {day: 'weather-icons-figma/sleet.png', night: 'weather-icons-figma/sleet.png'},
    fog: {day: 'weather-icons-figma/fog.png', night: 'weather-icons-figma/fog.png'},
    storm: {day: 'weather-icons-figma/storm.png', night: 'weather-icons-figma/storm.png'},
};
const VISIBLE_HOURS = 5;
const DAILY_RANGE_WIDTH = 78;
const HOURLY_CARD_PITCH = 75;
const MAX_BACKGROUND_BLUR_RADIUS = 120;
const DEFAULT_BACKGROUND_BLUR = 90;
const DEFAULT_BACKGROUND_COLOR = '#1f2640';
const WALLET_OPTIONS = [
    {id: 'usdt-erc20', label: 'USDT ERC20', icon: 'usdt.svg', address: '0x7Cd7E61342709759603fc23E9AE557bFeF48c0B4'},
    {id: 'usdt-tron', label: 'USDT Tron', icon: 'usdt.svg', address: 'TSXup7mXvWVZVKNkrnJRkpzpjGe3nZFks1'},
    {id: 'usdt-ton', label: 'USDT Ton', icon: 'usdt.svg', address: 'UQAcNYp_AAGerGRnNTUINWTCfSoQMYVVWqka-jVkowHsSn8j'},
    {id: 'eth', label: 'ETH', icon: 'eth.svg', address: '0x7Cd7E61342709759603fc23E9AE557bFeF48c0B4'},
    {id: 'btc', label: 'BTC', icon: 'btc.svg', address: 'bc1qz4y9uxs0gm50t0sy3jv2846j3s03g99p89h9cl'},
    {id: 'tron', label: 'TRON', icon: 'tron.svg', address: 'TSXup7mXvWVZVKNkrnJRkpzpjGe3nZFks1'},
    {id: 'gram', label: 'GRAM', icon: 'gram.svg', address: 'UQAcNYp_AAGerGRnNTUINWTCfSoQMYVVWqka-jVkowHsSn8j'},
    {id: 'solana', label: 'Solana', icon: 'solana.svg', address: '4W6rpXy5N4a8SotLuNsbLqy47RQXdg569B7eANMv4JrE'},
];
// Keep the popup below the panel with the same small breathing room as the
// other GNOME Shell menus. This is applied to the visual surface itself so it
// also moves the native blur actor, independently of BoxPointer arrow sizing.
const POPUP_TOP_GAP = 6;

function conditionKey(code) {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'partly';
    if (code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 57) return 'drizzle';
    if (code === 65 || code === 82) return 'heavy-rain';
    if (code === 66 || code === 67) return 'freezing-rain';
    if (code === 75 || code === 86) return 'heavy-snow';
    if ((code >= 71 && code <= 77) || code === 85) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
}

export default class WeatherRuExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._http = new Soup.Session({
            user_agent: 'iWeather/2.0 (GNOME Shell extension)',
            timeout: 15,
        });
        this._hourly = [];
        this._daily = [];
        this._current = null;
        this._location = FALLBACK_LOCATION;
        this._hourOffset = 0;
        this._hourScrollX = 0;
        this._hourStrip = null;
        this._hourViewport = null;
        this._hourPrevButton = null;
        this._hourNextButton = null;
        this._dailyScroll = null;
        this._metricLabels = new Set();
        this._hourDragActor = null;
        this._hourDragGrab = null;
        this._hourDragStartX = 0;
        this._hourDragStartScrollX = 0;
        this._hourDragMaxScroll = 0;
        this._refreshSource = 0;
        this._settingsDebounceSource = 0;
        this._retrySource = 0;
        this._retryDelay = 15;
        this._networkMonitor = null;
        this._networkChangedId = 0;
        this._requestId = 0;
        this._cancellable = null;
        this._loading = false;
        this._lastError = null;
        this._lastUpdated = null;
        this._writingLocationCache = false;
        this._walletOpen = false;
        this._expandedWalletOptions = new Set();
        this._walletFeedbackSource = 0;
        this._menuRoot = null;
        this._blurBackdrop = null;
        this._blurSyncSource = 0;
        this._roundedBlurApi = null;
        const blurLoadToken = {};
        this._blurLoadToken = blurLoadToken;
        this._menuOpen = false;
        this._settings.connectObject(
            'changed::language', () => {
                this._safeRebuildMenu();
                this._scheduleWeatherUpdate();
            },
            'changed::temperature-unit', () => {
                this._applyPanelWeather();
                this._safeRebuildMenu();
            },
            'changed::hardware-acceleration', () => this._safeRebuildMenu(),
            'changed::background-opacity', () => this._applyVisualSettings(),
            'changed::background-blur', () => this._applyVisualSettings(),
            'changed::background-color', () => this._applyVisualSettings(),
            'changed::location-mode', () => this._scheduleWeatherUpdate(),
            'changed::manual-latitude', () => this._scheduleWeatherUpdate(),
            'changed::manual-longitude', () => this._scheduleWeatherUpdate(),
            'changed::manual-location-name', () => this._scheduleWeatherUpdate(),
            'changed::location-cache', () => {
                if (!this._writingLocationCache)
                    this._scheduleWeatherUpdate();
            }, this,
        );

        // Keep the compact top-bar treatment from the installed extension.
        this._indicator = new PanelMenu.Button(0.5, this.metadata.name, false);
        this._indicator.menu.actor.add_style_class_name('weather-ru-popup');
        this._makePopupSurfaceTransparent();
        this._panelBox = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        this._panelIcon = new St.Icon({icon_name: 'weather-clear-symbolic', style_class: 'system-status-icon'});
        this._panelLabel = new St.Label({text: '--°', y_align: Clutter.ActorAlign.CENTER, style: 'font-weight: bold; font-size: 11px; padding: 0 4px;'});
        this._panelBox.add_child(this._panelIcon); this._panelBox.add_child(this._panelLabel); this._indicator.add_child(this._panelBox);
        this._indicator.menu.connectObject('open-state-changed', (_menu, open) => {
            this._menuOpen = open;
            // The menu is fully built when weather data arrives. Rebuilding it
            // on every click forces all image textures and text layouts through
            // the main loop, which is especially visible in the popup animation.
            if (open && !this._menuRoot)
                this._safeRebuildMenu();
            if (open) {
                this._blurBackdrop?.show();
                this._scheduleBlurBackdropSync();
            } else {
                this._blurBackdrop?.hide();
                this._cancelHourlyDrag();
            }
        }, this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        // GI module lookup happens after enable(), as required by the EGO
        // lifecycle rules. The actor and effect are created later with menu UI.
        void loadOptionalBlurModule().then(blurApi => {
            if (this._blurLoadToken === blurLoadToken && this._indicator) {
                this._roundedBlurApi = blurApi;
                this._safeRebuildMenu();
            }
        });

        this._networkMonitor = Gio.NetworkMonitor.get_default();
        this._networkChangedId = this._networkMonitor.connect('network-changed', (_monitor, available) => {
            if (available && this._indicator) {
                this._cancelRetry();
                this._scheduleWeatherUpdate();
            }
        });

        void this._updateWeather();
        this._refreshSource = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 600, () => { void this._updateWeather(); return GLib.SOURCE_CONTINUE; });
    }

    _language() {
        const language = this._settings.get_string('language');
        return TEXT[language] ? language : DEFAULT_LANGUAGE;
    }
    _text() { return TEXT[this._language()]; }
    _hardwareAcceleration() { return this._settings.get_boolean('hardware-acceleration'); }
    _backgroundBlur() {
        const blur = this._settings.get_int('background-blur');
        return Number.isFinite(blur)
            ? Math.max(0, Math.min(100, Math.round(blur)))
            : DEFAULT_BACKGROUND_BLUR;
    }
    _backgroundOpacity() {
        const opacity = this._settings.get_int('background-opacity');
        return Number.isFinite(opacity) ? Math.max(0, Math.min(100, Math.round(opacity))) : 60;
    }
    _backgroundColor() {
        const value = this._settings.get_string('background-color')?.trim() ?? '';
        return /^#[0-9a-f]{6}$/iu.test(value) ? value.toLowerCase() : DEFAULT_BACKGROUND_COLOR;
    }
    _backgroundRgb() {
        const color = this._backgroundColor().slice(1);
        return [0, 2, 4].map(offset => Number.parseInt(color.slice(offset, offset + 2), 16));
    }
    _backgroundStyle() {
        const alpha = (this._backgroundOpacity() / 100).toFixed(3);
        const borderAlpha = (this._backgroundOpacity() / 100 * 0.15).toFixed(3);
        const [red, green, blue] = this._backgroundRgb();
        const start = [red, green, blue].map(channel => Math.min(255, channel + 12));
        const end = [red, green, blue].map(channel => Math.max(0, channel - 12));
        return `background-color: rgba(${red}, ${green}, ${blue}, ${alpha}); background-gradient-direction: vertical; background-gradient-start: rgba(${start.join(', ')}, ${alpha}); background-gradient-end: rgba(${end.join(', ')}, ${alpha}); border: 1px solid rgba(224, 234, 255, ${borderAlpha});`;
    }
    _backgroundBorderStyle() {
        const borderAlpha = (this._backgroundOpacity() / 100 * 0.15).toFixed(3);
        return `background-color: transparent; background-gradient-start: transparent; background-gradient-end: transparent; border: 1px solid rgba(224, 234, 255, ${borderAlpha});`;
    }
    _backgroundTintStyle() {
        const [red, green, blue] = this._backgroundRgb();
        const start = [red, green, blue].map(channel => Math.min(255, channel + 12));
        const end = [red, green, blue].map(channel => Math.max(0, channel - 12));
        return {
            start: start.map(channel => channel / 255),
            end: end.map(channel => channel / 255),
        };
    }
    _applyMenuBackground(root = this._menuRoot) {
        if (!root)
            return;
        root.set_style(this._blurBackdrop?.uses_tint_layer?.()
            ? this._backgroundBorderStyle()
            : this._backgroundStyle());
    }
    _makePopupSurfaceTransparent() {
        // The popup's BoxPointer and its content are different actors. Inline
        // styles prevent the active Shell theme from leaving a square backdrop
        // or a second, hard-edged shadow around the rounded menu surface.
        this._indicator.menu.actor.set_style('-arrow-background-color: transparent; -arrow-border-color: transparent; -arrow-border-width: 0px; -arrow-base: 0px; -arrow-rise: 0px; -boxpointer-gap: 0px; -arrow-border-radius: 0px; min-width: 0px; min-height: 0px; margin: 0px; padding: 0px; background-color: transparent; border: 0px solid transparent; box-shadow: none;');
        this._indicator.menu.box.set_style('min-width: 0px; min-height: 0px; margin: 0px; padding: 0px; background-color: transparent; background-gradient-start: transparent; background-gradient-end: transparent; border: 0px solid transparent; border-radius: 0px; box-shadow: none;');
    }
    _blurRadius() {
        const blurStrength = Math.pow(this._backgroundBlur() / 100, 1.3);
        return blurStrength * MAX_BACKGROUND_BLUR_RADIUS;
    }
    _blurBrightness() {
        return 1 - this._backgroundBlur() / 100 * 0.18;
    }
    _applyGaussianBlur(root = this._menuRoot) {
        this._blurBackdrop?.update(this._blurRadius(), this._blurBrightness());
        if (this._menuOpen)
            this._blurBackdrop?.show();
        root?.queue_redraw();
    }
    _scheduleBlurBackdropSync() {
        if (this._blurSyncSource)
            return;
        this._blurSyncSource = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._blurSyncSource = 0;
            this._applyGaussianBlur();
            return GLib.SOURCE_REMOVE;
        });
    }
    _applyVisualSettings(root = this._menuRoot) {
        this._blurBackdrop?.set_tint(this._backgroundTintStyle(), this._backgroundOpacity() / 100);
        this._applyGaussianBlur(root);
        this._applyMenuBackground(root);
    }
    _unit() { return this._settings.get_string('temperature-unit') === 'fahrenheit' ? '°F' : '°C'; }
    _temp(value) {
        if (typeof value !== 'number' || !Number.isFinite(value))
            return null;
        const n = this._settings.get_string('temperature-unit') === 'fahrenheit'
            ? (value * 9 / 5 + 32)
            : value;
        return Math.round(n);
    }
    _tempText(value, includeUnit = true) {
        const temperature = this._temp(value);
        if (temperature === null)
            return '--';
        return `${temperature}${includeUnit ? this._unit() : '°'}`;
    }
    _icon(code) { return ICONS[code] || 'weather-clear-symbolic'; }
    _weatherIconFile(code, isDay = true) {
        const variants = WEATHER_ICON_FILES[conditionKey(code)] ?? WEATHER_ICON_FILES.clear;
        return variants[isDay ? 'day' : 'night'];
    }
    _weatherText(code, short = false) {
        const text = this._text();
        return (short ? (text.shortConditions ?? text.conditions) : text.conditions)[conditionKey(code)];
    }
    _formatHour(iso) { return typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : '--:--'; }
    _locale() { return LANGUAGE_META[this._language()]?.locale ?? 'en-US'; }
    _formatDate(iso) { return new Date(`${iso}T12:00:00`).toLocaleDateString(this._locale(), {day: 'numeric', month: 'short'}); }
    _dayLabel(iso, index) {
        if (index === 0)
            return this._text().today;
        return new Date(`${iso}T12:00:00`).toLocaleDateString(this._locale(), {weekday: 'short'}).replace(/\.$/u, '');
    }

    _validCoordinates(lat, lon) {
        return Number.isFinite(lat) && Number.isFinite(lon) &&
            lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    }

    _requestIsCurrent(requestId, cancellable) {
        return this._indicator && requestId === this._requestId && !cancellable.is_cancelled();
    }

    _scheduleWeatherUpdate() {
        this._cancelRetry();
        if (this._settingsDebounceSource)
            GLib.Source.remove(this._settingsDebounceSource);
        this._settingsDebounceSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            this._settingsDebounceSource = 0;
            void this._updateWeather();
            return GLib.SOURCE_REMOVE;
        });
    }

    _cancelRetry() {
        if (this._retrySource)
            GLib.Source.remove(this._retrySource);
        this._retrySource = 0;
    }

    _scheduleRetry() {
        if (this._retrySource || !this._indicator)
            return;
        const delay = this._retryDelay;
        this._retryDelay = Math.min(this._retryDelay * 2, 300);
        this._retrySource = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, delay, () => {
            this._retrySource = 0;
            void this._updateWeather();
            return GLib.SOURCE_REMOVE;
        });
    }

    _safeRebuildMenu() {
        try {
            this._cancelHourlyDrag();
            this._rebuildMenu();
        } catch (error) {
            console.error(`iWeather interface: ${error}`);
        }
    }

    _hourMaxScroll() {
        if (!this._hourStrip || !this._hourViewport)
            return 0;
        return Math.max(0, this._hourStrip.width - this._hourViewport.width);
    }

    _setHourScroll(scrollX) {
        const maxScroll = this._hourMaxScroll();
        const next = Math.max(0, Math.min(maxScroll, scrollX));
        this._hourScrollX = next;
        this._hourOffset = Math.round(next / HOURLY_CARD_PITCH);
        if (this._hourStrip) {
            this._hourStrip.translation_x = -next;
            const currentHourCard = this._hourStrip.get_first_child();
            if (currentHourCard) {
                if (next <= 0.5)
                    currentHourCard.add_style_class_name('selected');
                else
                    currentHourCard.remove_style_class_name('selected');
            }
        }
        if (this._hourPrevButton) {
            this._hourPrevButton.reactive = next > 0.5;
            this._hourPrevButton.opacity = next > 0.5 ? 255 : 96;
        }
        if (this._hourNextButton) {
            this._hourNextButton.reactive = next < maxScroll - 0.5;
            this._hourNextButton.opacity = next < maxScroll - 0.5 ? 255 : 96;
        }
    }

    _changeHourOffset(step) {
        this._setHourScroll(this._hourScrollX + step * HOURLY_CARD_PITCH);
        this._blurBackdrop?.queueRepaint();
    }

    _beginHourlyDrag(actor, event) {
        if (event.get_button() !== 1)
            return Clutter.EVENT_PROPAGATE;
        const [x] = event.get_coords();
        this._cancelHourlyDrag();
        this._hourDragActor = actor;
        this._hourDragStartX = x;
        this._hourDragStartScrollX = this._hourScrollX;
        this._hourDragMaxScroll = this._hourMaxScroll();
        try {
            this._hourDragGrab = global.stage.grab(actor);
        } catch (error) {
            console.debug(`iWeather pointer grab: ${error}`);
        }
        this._blurBackdrop?.queueRepaint();
        return Clutter.EVENT_STOP;
    }

    _moveHourlyDrag(actor, event) {
        if (this._hourDragActor !== actor)
            return Clutter.EVENT_PROPAGATE;
        const [x] = event.get_coords();
        const distance = x - this._hourDragStartX;
        const next = Math.max(0, Math.min(this._hourDragMaxScroll, this._hourDragStartScrollX - distance));
        this._setHourScroll(next);
        this._blurBackdrop?.queueRepaint();
        return Clutter.EVENT_STOP;
    }

    _endHourlyDrag(actor, event) {
        if (this._hourDragActor !== actor)
            return Clutter.EVENT_PROPAGATE;
        this._cancelHourlyDrag();
        this._blurBackdrop?.queueRepaint();
        return Clutter.EVENT_STOP;
    }

    _cancelHourlyDrag() {
        this._hourDragActor = null;
        try {
            this._hourDragGrab?.dismiss();
        } catch (error) {
            console.debug(`iWeather pointer release: ${error}`);
        }
        this._hourDragGrab = null;
        this._hourDragMaxScroll = 0;
    }

    _httpJson(url, cancellable) {
        const session = this._http;
        if (!session)
            return Promise.reject(new Error('HTTP session is unavailable'));
        const message = Soup.Message.new('GET', url);
        message.request_headers.append('Accept', 'application/json');
        return new Promise((resolve, reject) => session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable, (_session, result) => {
            try {
                const bytes = session.send_and_read_finish(result);
                if (message.status_code < 200 || message.status_code >= 300)
                    throw new Error(`HTTP ${message.status_code}`);
                const data = bytes?.get_data();
                if (!data) throw new Error('No data');
                resolve(JSON.parse(new TextDecoder().decode(data)));
            } catch (error) { reject(error); }
        }));
    }

    _writeLocationCache(lat, lon, name) {
        this._writingLocationCache = true;
        try {
            this._settings.set_string('location-cache', `${lat},${lon}|${name}|${this._language()}`);
        } finally {
            this._writingLocationCache = false;
        }
    }

    async _localizedLocationName({lat, lon, name, countryCode = ''}, cancellable) {
        const seed = (name || '').split(',')[0].trim();
        if (!seed)
            return name;
        const query = {
            name: seed,
            count: '10',
            language: this._language(),
            format: 'json',
        };
        if (countryCode)
            query.countryCode = countryCode;
        const json = await this._httpJson(`${GEOCODING_API}?${Soup.form_encode_hash(query)}`, cancellable);
        const candidates = (json?.results || []).filter(result =>
            Number.isFinite(result.latitude) && Number.isFinite(result.longitude));
        if (candidates.length === 0)
            return name;
        candidates.sort((a, b) => {
            const distanceA = (a.latitude - lat) ** 2 + (a.longitude - lon) ** 2;
            const distanceB = (b.latitude - lat) ** 2 + (b.longitude - lon) ** 2;
            return distanceA - distanceB;
        });
        const closest = candidates[0];
        return [...new Set([closest.name, closest.admin1].filter(Boolean))].join(', ') || name;
    }

    async _resolveLocation(cancellable) {
        if (this._settings.get_string('location-mode') === 'manual') {
            const lat = this._settings.get_double('manual-latitude');
            const lon = this._settings.get_double('manual-longitude');
            if (!this._validCoordinates(lat, lon))
                throw new Error('Invalid manual coordinates');
            return {
                lat,
                lon,
                name: this._settings.get_string('manual-location-name').trim() || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
            };
        }
        const cache = this._settings.get_string('location-cache');
        if (cache) {
            const [coords, name, cachedLanguage] = cache.split('|');
            const [lat, lon] = coords.split(',').map(Number);
            if (this._validCoordinates(lat, lon)) {
                let localizedName = name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                if (cachedLanguage !== this._language()) {
                    try {
                        localizedName = await this._localizedLocationName({lat, lon, name: localizedName}, cancellable);
                        this._writeLocationCache(lat, lon, localizedName);
                    } catch (error) {
                        console.warn(`iWeather localized location: ${error}`);
                    }
                }
                return {lat, lon, name: localizedName};
            }
        }
        try {
            const json = await this._httpJson(GEO_API, cancellable);
            const [lat, lon] = (json.loc || '').split(',').map(Number);
            if (this._validCoordinates(lat, lon)) {
                const detectedName = [json.city, json.region].filter(Boolean).join(', ') || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                let name = detectedName;
                try {
                    name = await this._localizedLocationName({lat, lon, name: detectedName, countryCode: json.country || ''}, cancellable);
                } catch (error) {
                    console.warn(`iWeather localized location: ${error}`);
                }
                this._writeLocationCache(lat, lon, name);
                return {lat, lon, name};
            }
        } catch (error) { console.warn(`iWeather location: ${error}`); }
        return FALLBACK_LOCATION;
    }

    async _updateWeather() {
        this._cancelRetry();
        const requestId = ++this._requestId;
        this._cancellable?.cancel();
        const cancellable = new Gio.Cancellable();
        this._cancellable = cancellable;
        this._loading = true;
        this._lastError = null;
        this._safeRebuildMenu();

        try {
            if (this._networkMonitor && !this._networkMonitor.network_available)
                throw new Error('Network is unavailable');
            const location = await this._resolveLocation(cancellable);
            if (!this._requestIsCurrent(requestId, cancellable))
                return;

            const params = Soup.form_encode_hash({latitude: String(location.lat), longitude: String(location.lon), current: 'temperature_2m,weather_code,is_day', hourly: 'temperature_2m,weather_code,is_day,precipitation_probability,wind_speed_10m,uv_index', daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max', forecast_days: '10', timezone: 'auto'});
            const data = await this._httpJson(`${WEATHER_API}?${params}`, cancellable);
            if (!this._requestIsCurrent(requestId, cancellable))
                return;
            if (!data?.current || !Array.isArray(data?.hourly?.time) || !Array.isArray(data?.daily?.time))
                throw new Error('Incomplete forecast response');
            if (typeof data.current.temperature_2m !== 'number')
                throw new Error('Missing current temperature');

            const currentTime = data.current.time || '';
            const foundHour = data.hourly.time.findIndex(time => time >= currentTime);
            const hourIndex = foundHour >= 0 ? foundHour : 0;
            const hourly = data.hourly.time.slice(hourIndex, hourIndex + 18).map((time, index) => {
                const sourceIndex = hourIndex + index;
                return {
                    time,
                    temp: data.hourly.temperature_2m?.[sourceIndex],
                    code: data.hourly.weather_code?.[sourceIndex] ?? 0,
                    rain: data.hourly.precipitation_probability?.[sourceIndex] ?? 0,
                    wind: data.hourly.wind_speed_10m?.[sourceIndex] ?? 0,
                    uv: data.hourly.uv_index?.[sourceIndex] ?? 0,
                    isDay: data.hourly.is_day?.[sourceIndex] !== 0,
                };
            }).filter(hour => typeof hour.temp === 'number');
            const daily = data.daily.time.map((time, index) => ({
                time,
                high: data.daily.temperature_2m_max?.[index],
                low: data.daily.temperature_2m_min?.[index],
                code: data.daily.weather_code?.[index] ?? 0,
                rain: data.daily.precipitation_probability_max?.[index] ?? 0,
            })).filter(day => typeof day.high === 'number' && typeof day.low === 'number');
            if (hourly.length === 0 || daily.length === 0)
                throw new Error('Forecast response contains no usable rows');

            this._location = location;
            this._current = data.current;
            this._hourly = hourly;
            this._daily = daily;
            this._hourOffset = 0;
            this._hourScrollX = 0;
            this._lastUpdated = new Date();
            this._lastError = null;
            this._loading = false;
            this._retryDelay = 15;
            this._applyPanelWeather();
            this._safeRebuildMenu();
        } catch (error) {
            if (cancellable.is_cancelled() || requestId !== this._requestId || !this._indicator)
                return;
            this._loading = false;
            this._lastError = String(error);
            console.warn(`iWeather forecast: ${error}`);
            this._safeRebuildMenu();
            this._scheduleRetry();
        } finally {
            if (requestId === this._requestId)
                this._cancellable = null;
        }
    }

    _applyPanelWeather() {
        if (!this._panelLabel || !this._panelIcon || !this._current)
            return;
        this._panelLabel.text = this._tempText(this._current.temperature_2m);
        this._panelIcon.icon_name = this._icon(this._current.weather_code);
    }

    _footerText() {
        const t = this._text();
        if (this._loading)
            return t.loading;
        if (this._lastError)
            return t.error;
        if (this._lastUpdated)
            return t.updated;
        return t.unavailable;
    }

    _clearMenu() {
        if (this._walletFeedbackSource)
            GLib.Source.remove(this._walletFeedbackSource);
        this._walletFeedbackSource = 0;
        this._blurBackdrop?.destroy();
        this._blurBackdrop = null;

        for (const label of this._metricLabels)
            label.disconnectObject(this);
        this._metricLabels.clear();
        this._dailyScroll?.disconnectObject(this);

        // Remove owned actors explicitly before destroying their menu item.
        // Keep the calls concrete so both the lifecycle and the ownership are
        // visible to static review tools. Children are removed before parents.
        if (this._dailyScroll) {
            this._dailyScroll.get_parent()?.remove_child(this._dailyScroll);
            this._dailyScroll.destroy();
        }
        if (this._hourPrevButton) {
            this._hourPrevButton.get_parent()?.remove_child(this._hourPrevButton);
            this._hourPrevButton.destroy();
        }
        if (this._hourNextButton) {
            this._hourNextButton.get_parent()?.remove_child(this._hourNextButton);
            this._hourNextButton.destroy();
        }
        if (this._hourStrip) {
            this._hourStrip.get_parent()?.remove_child(this._hourStrip);
            this._hourStrip.destroy();
        }
        if (this._hourViewport) {
            this._hourViewport.get_parent()?.remove_child(this._hourViewport);
            this._hourViewport.destroy();
        }
        if (this._menuRoot) {
            this._menuRoot.get_parent()?.remove_child(this._menuRoot);
            this._menuRoot.destroy();
        }
        for (const item of this._indicator.menu._getMenuItems()) item.destroy();
        this._dailyScroll = null;
        this._hourPrevButton = null;
        this._hourNextButton = null;
        this._hourStrip = null;
        this._hourViewport = null;
        this._menuRoot = null;
    }
    _label(text, styleClass, params = {}) { return new St.Label({text, style_class: styleClass, ...params}); }
    _iconActor(code, size = 22, isDay = true) {
        const file = Gio.File.new_for_path(GLib.build_filenamev([
            this.path, 'assets', this._weatherIconFile(code, isDay),
        ]));
        return createWeatherIcon({
            file: this._hardwareAcceleration() ? file : null,
            iconName: this._icon(code),
            size,
        });
    }
    _symbolicIconActor(code, size = 22, styleClass = '') {
        return new St.Icon({
            icon_name: this._icon(code),
            icon_size: size,
            style_class: `weather-ru-symbolic-icon ${styleClass}`.trim(),
            y_align: Clutter.ActorAlign.CENTER,
        });
    }
    _assetIcon(fileName, size, styleClass = '') {
        const file = Gio.File.new_for_path(GLib.build_filenamev([
            this.path, 'assets', 'wallet', fileName,
        ]));
        return new St.Icon({
            gicon: new Gio.FileIcon({file}),
            icon_size: size,
            style_class: styleClass,
            y_align: Clutter.ActorAlign.CENTER,
        });
    }
    _baseItem(child) {
        // PopupBaseMenuItem only accepts its own menu-item parameters. Passing
        // Clutter layout properties here throws on GNOME 50 and leaves the
        // popup with no item (and therefore a zero width).
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        item.add_style_class_name('weather-ru-root-item');
        item.add_child(child);
        return item;
    }

    _metricRow(iconName, text, styleClass) {
        const row = new St.BoxLayout({
            style_class: `weather-ru-metric ${styleClass}`,
            x_align: Clutter.ActorAlign.CENTER,
        });
        row.add_child(new St.Icon({icon_name: iconName, icon_size: 12, style_class: 'weather-ru-metric-icon'}));
        const label = this._label(text, 'weather-ru-metric-label', {
            x_align: Clutter.ActorAlign.END,
        });
        label.connectObject('notify::allocation', () => {
            try {
                const [ink, logical] = label.clutter_text.get_layout().get_pixel_extents();
                // Clutter aligns the label allocation to the column's right
                // edge; compensate only the font's remaining right bearing.
                const rightBearing = logical.width - (ink.x + ink.width);
                const opticalOffset = styleClass === 'rain' ? 2 : styleClass === 'uv' ? 1 : 0;
                label.translation_x = Math.max(-3, Math.min(5, rightBearing + opticalOffset));
            } catch (error) {
                label.translation_x = 0;
            }
        }, this);
        this._metricLabels.add(label);
        row.add_child(new St.Bin({
            child: label,
            width: 50,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'weather-ru-metric-label-bin',
        }));
        return row;
    }

    _separator() {
        return new St.Bin({style_class: 'weather-ru-separator', x_expand: true});
    }

    _rebuildMenu() {
        if (!this._indicator) return;
        this._clearMenu();
        const t = this._text();
        const root = new St.BoxLayout({vertical: true, style_class: 'weather-ru-menu-box', x_expand: true});
        // BoxPointer's arrow is transparent, so its rise cannot be relied on
        // as a visible gap. Translating the content keeps the rounded native
        // blur and the content aligned and leaves a deterministic 6 px gap.
        root.translation_y = POPUP_TOP_GAP;
        this._menuRoot = root;
        this._applyMenuBackground(root);

        const header = new St.BoxLayout({style_class: 'weather-ru-header', y_align: Clutter.ActorAlign.CENTER});
        const locationBar = new St.BoxLayout({
            style_class: 'weather-ru-location-bar',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        locationBar.add_child(new St.Icon({
            icon_name: 'mark-location-symbolic',
            icon_size: 14,
            style_class: 'weather-ru-header-icon weather-ru-location-icon',
            y_align: Clutter.ActorAlign.CENTER,
            translation_y: 1,
        }));
        const location = this._label(this._location?.name || '—', 'weather-ru-location', {
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        location.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        locationBar.add_child(location);
        const refresh = new St.Button({
            child: new St.Icon({
                icon_name: 'view-refresh-symbolic',
                icon_size: 14,
                style_class: 'weather-ru-header-icon',
                y_align: Clutter.ActorAlign.CENTER,
                translation_y: 1,
            }),
            style_class: 'weather-ru-control-button',
            can_focus: true,
            accessible_name: t.refresh,
            y_align: Clutter.ActorAlign.CENTER,
        });
        refresh.connect('clicked', () => { void this._updateWeather(); });
        locationBar.add_child(refresh);
        const wallet = new St.Button({
            child: this._assetIcon('wallet.svg', 14, 'weather-ru-header-icon'),
            style_class: `weather-ru-control-button ${this._walletOpen ? 'active' : ''}`.trim(),
            can_focus: true,
            accessible_name: t.wallet,
            y_align: Clutter.ActorAlign.CENTER,
        });
        wallet.child.translation_y = 1;
        wallet.connect('clicked', () => {
            this._walletOpen = !this._walletOpen;
            this._safeRebuildMenu();
        });
        locationBar.add_child(wallet);
        const settings = new St.Button({
            child: new St.Icon({
                icon_name: 'emblem-system-symbolic',
                icon_size: 14,
                style_class: 'weather-ru-header-icon',
                y_align: Clutter.ActorAlign.CENTER,
                translation_y: 1,
            }),
            style_class: 'weather-ru-control-button',
            can_focus: true,
            accessible_name: t.settings,
            y_align: Clutter.ActorAlign.CENTER,
        });
        settings.connect('clicked', () => {
            this._indicator?.menu.close();
            this.openPreferences();
        });
        locationBar.add_child(settings);
        header.add_child(locationBar);
        root.add_child(header);
        root.add_child(this._separator());

        if (this._walletOpen) {
            root.add_child(this._walletSection(t));
            this._indicator.menu.addMenuItem(this._baseItem(root));
            void this._attachMenuBackdrop(root);
            return;
        }

        const current = new St.BoxLayout({style_class: 'weather-ru-current', x_expand: true, y_align: Clutter.ActorAlign.CENTER});
        const currentLeft = new St.BoxLayout({style_class: 'weather-ru-current-left', y_align: Clutter.ActorAlign.CENTER});
        currentLeft.add_child(this._iconActor(this._current?.weather_code ?? 3, 76, this._current?.is_day !== 0));
        const currentCopy = new St.BoxLayout({vertical: true, style_class: 'weather-ru-current-copy', y_align: Clutter.ActorAlign.CENTER});
        currentCopy.add_child(this._label(
            this._tempText(this._current?.temperature_2m, false),
            'weather-ru-current-temp',
            {x_align: Clutter.ActorAlign.START},
        ));
        const currentCondition = this._label(
            this._current ? this._weatherText(this._current.weather_code) : t.unavailable,
            'weather-ru-current-condition',
            {x_align: Clutter.ActorAlign.START},
        );
        currentCondition.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        // Move only the glyphs upward; changing margin/padding here affects
        // the parent allocation in GNOME Shell and can make the popup grow.
        currentCondition.translation_y = -18;
        currentCopy.add_child(currentCondition);
        currentLeft.add_child(currentCopy);
        current.add_child(currentLeft);
        current.add_child(new St.Bin({style_class: 'weather-ru-current-divider'}));
        const currentRange = new St.BoxLayout({vertical: true, style_class: 'weather-ru-current-range', y_align: Clutter.ActorAlign.CENTER});
        currentRange.translation_y = 22;
        [[t.max, this._daily[0]?.high], [t.min, this._daily[0]?.low]].forEach(([label, value]) => {
            const compactLabel = label.replace(/:+$/u, '');
            const rangeRow = new St.BoxLayout({style_class: 'weather-ru-current-range-row'});
            rangeRow.add_child(this._label(`${compactLabel}:`, 'weather-ru-current-range-label'));
            rangeRow.add_child(this._label(
                this._tempText(value, false),
                'weather-ru-current-range-temp',
                {x_align: Clutter.ActorAlign.END},
            ));
            currentRange.add_child(rangeRow);
        });
        current.add_child(currentRange);
        root.add_child(current);
        root.add_child(this._separator());

        root.add_child(this._hourlySection(t));
        root.add_child(this._separator());
        root.add_child(this._dailySection(t));
        this._indicator.menu.addMenuItem(this._baseItem(root));
        void this._attachMenuBackdrop(root);
    }

    async _attachMenuBackdrop(root) {
        const backdrop = new WeatherGaussianBackdrop(
            this._indicator.menu.actor,
            root,
            this._roundedBlurApi,
        );
        this._blurBackdrop = backdrop;
        const created = await backdrop.create();
        if (!created || this._blurBackdrop !== backdrop || this._menuRoot !== root || !this._indicator) {
            backdrop.destroy();
            if (this._blurBackdrop === backdrop)
                this._blurBackdrop = null;
            return;
        }
        this._applyVisualSettings(root);
        if (this._menuOpen) {
            backdrop.show();
            this._scheduleBlurBackdropSync();
        }
    }

    _walletSection(t) {
        const section = new St.BoxLayout({vertical: true, style_class: 'weather-ru-wallet-section'});
        section.add_child(this._label(t.walletTitle, 'weather-ru-wallet-title'));
        const hint = this._label(t.walletHint, 'weather-ru-wallet-hint');
        hint.clutter_text.line_wrap = true;
        hint.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        section.add_child(hint);

        const list = new St.BoxLayout({vertical: true, style_class: 'weather-ru-wallet-list'});
        for (const option of WALLET_OPTIONS) {
            const expanded = this._expandedWalletOptions.has(option.id);
            const item = new St.BoxLayout({
                vertical: true,
                style_class: `weather-ru-wallet-item ${expanded ? 'expanded' : ''}`.trim(),
            });
            const row = new St.BoxLayout({style_class: 'weather-ru-wallet-row', x_expand: true});
            row.add_child(this._assetIcon(option.icon, 24, 'weather-ru-wallet-coin-icon'));
            row.add_child(this._label(option.label, 'weather-ru-wallet-label', {
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            }));
            row.add_child(new St.Icon({
                icon_name: expanded ? 'pan-down-symbolic' : 'pan-end-symbolic',
                icon_size: 12,
                style_class: 'weather-ru-wallet-chevron',
                y_align: Clutter.ActorAlign.CENTER,
            }));
            const toggle = new St.Button({
                child: row,
                style_class: 'weather-ru-wallet-toggle',
                can_focus: true,
                x_expand: true,
                accessible_name: option.label,
            });
            toggle.connect('clicked', () => {
                if (expanded)
                    this._expandedWalletOptions.delete(option.id);
                else
                    this._expandedWalletOptions.add(option.id);
                this._safeRebuildMenu();
            });
            item.add_child(toggle);

            if (expanded) {
                const addressRow = new St.BoxLayout({style_class: 'weather-ru-wallet-address-row', x_expand: true});
                const address = this._label(option.address, 'weather-ru-wallet-address', {
                    x_expand: true,
                    y_align: Clutter.ActorAlign.CENTER,
                });
                address.clutter_text.ellipsize = Pango.EllipsizeMode.MIDDLE;
                const feedback = this._label(t.copyAddress, 'weather-ru-wallet-copy-label', {
                    y_align: Clutter.ActorAlign.CENTER,
                });
                addressRow.add_child(address);
                addressRow.add_child(new St.Icon({
                    icon_name: 'edit-copy-symbolic',
                    icon_size: 13,
                    style_class: 'weather-ru-wallet-copy-icon',
                    y_align: Clutter.ActorAlign.CENTER,
                }));
                addressRow.add_child(feedback);
                const copy = new St.Button({
                    child: addressRow,
                    style_class: 'weather-ru-wallet-address-button',
                    can_focus: true,
                    x_expand: true,
                    accessible_name: `${t.copyAddress}: ${option.label}`,
                });
                copy.connect('clicked', () => {
                    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, option.address);
                    feedback.text = t.copied;
                    copy.add_style_pseudo_class('checked');
                    if (this._walletFeedbackSource)
                        GLib.Source.remove(this._walletFeedbackSource);
                    this._walletFeedbackSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1600, () => {
                        feedback.text = t.copyAddress;
                        copy.remove_style_pseudo_class('checked');
                        this._walletFeedbackSource = 0;
                        return GLib.SOURCE_REMOVE;
                    });
                });
                item.add_child(copy);
            }
            list.add_child(item);
        }

        section.add_child(new St.ScrollView({
            style_class: 'weather-ru-wallet-scroll',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.EXTERNAL,
            enable_mouse_scrolling: true,
            child: list,
        }));
        return section;
    }

    _hourlySection(t) {
        const box = new St.BoxLayout({vertical: true, style_class: 'weather-ru-hourly-section'});
        box.add_child(this._label(t.hourly, 'weather-ru-section-title'));
        if (this._hourly.length === 0) {
            box.add_child(this._label(this._loading ? t.loading : t.unavailable, 'weather-ru-empty', {x_align: Clutter.ActorAlign.CENTER, x_expand: true}));
            return box;
        }
        const line = new St.Widget({
            style_class: 'weather-ru-hourly',
            width: 407,
            height: 149,
            clip_to_allocation: false,
            layout_manager: new Clutter.FixedLayout(),
        });
        const viewport = new St.Widget({
            style_class: 'weather-ru-hour-viewport',
            width: VISIBLE_HOURS * HOURLY_CARD_PITCH,
            height: 149,
            reactive: true,
            clip_to_allocation: true,
            layout_manager: new Clutter.FixedLayout(),
        });
        const hours = new St.BoxLayout({
            style_class: 'weather-ru-hour-strip',
            width: Math.max(0, this._hourly.length * HOURLY_CARD_PITCH - 3),
            height: 149,
        });
        this._hourViewport = viewport;
        this._hourStrip = hours;
        viewport.set_position(16, 0);
        this._hourly.forEach((hour, index) => {
            const col = new St.BoxLayout({
                vertical: true,
                clip_to_allocation: false,
                style_class: `weather-ru-hour${index === 0 ? ' selected' : ''}`,
            });
            col.add_child(this._label(index === 0 ? t.now : this._formatHour(hour.time), 'weather-ru-hour-time', {x_align: Clutter.ActorAlign.CENTER}));
            col.add_child(this._iconActor(hour.code, 31, hour.isDay));
            col.add_child(this._label(this._tempText(hour.temp, false), 'weather-ru-hour-temp', {x_align: Clutter.ActorAlign.CENTER}));
            const condition = this._label(this._weatherText(hour.code, true), 'weather-ru-hour-condition', {x_align: Clutter.ActorAlign.CENTER});
            condition.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            col.add_child(condition);
            col.add_child(this._metricRow('weather-windy-symbolic', `${Math.round(hour.wind / 3.6)} ${t.wind}`, 'wind'));
            col.add_child(this._metricRow('weather-clear-symbolic', `${t.uv} ${Math.round(hour.uv)}`, 'uv'));
            col.add_child(this._metricRow('weather-showers-symbolic', `${Math.round(hour.rain)}%`, 'rain'));
            hours.add_child(col);
        });
        viewport.add_child(hours);
        const previous = new St.Button({
            child: new St.Icon({icon_name: 'pan-start-symbolic', icon_size: 12}),
            style_class: 'weather-ru-hour-nav-button',
            can_focus: false,
            accessible_name: t.previous,
            width: 16,
            height: 28,
        });
        // Place the controls at the outer edges, with a small outward offset
        // so the first and last weather figures remain unobstructed.
        previous.set_position(-10, 61);
        previous.connect('clicked', () => this._changeHourOffset(-1));
        const next = new St.Button({
            child: new St.Icon({icon_name: 'pan-end-symbolic', icon_size: 12}),
            style_class: 'weather-ru-hour-nav-button',
            can_focus: false,
            accessible_name: t.next,
            width: 16,
            height: 28,
        });
        next.set_position(401, 61);
        next.connect('clicked', () => this._changeHourOffset(1));
        this._hourPrevButton = previous;
        this._hourNextButton = next;
        viewport.connect('button-press-event', (actor, event) => this._beginHourlyDrag(actor, event));
        viewport.connect('motion-event', (actor, event) => this._moveHourlyDrag(actor, event));
        viewport.connect('button-release-event', (actor, event) => this._endHourlyDrag(actor, event));
        line.add_child(previous);
        line.add_child(viewport);
        line.add_child(next);
        this._setHourScroll(this._hourScrollX);
        box.add_child(line);
        return box;
    }

    _dailySection(t) {
        const box = new St.BoxLayout({vertical: true, style_class: 'weather-ru-daily-section'});
        box.add_child(this._label(t.daily, 'weather-ru-section-title'));
        if (this._daily.length === 0) {
            box.add_child(this._label(this._loading ? t.loading : t.unavailable, 'weather-ru-empty', {x_align: Clutter.ActorAlign.CENTER, x_expand: true}));
            return box;
        }
        const rows = new St.BoxLayout({vertical: true, style_class: 'weather-ru-daily'}); const lows = this._daily.map((d) => d.low); const highs = this._daily.map((d) => d.high); const min = Math.min(...lows); const max = Math.max(...highs); const spread = max - min || 1;
        this._daily.forEach((day, index) => {
            const row = new St.BoxLayout({style_class: `weather-ru-day-row ${index === 0 ? 'today' : 'separated'}`, x_expand: true, y_align: Clutter.ActorAlign.CENTER});
            const dayCopy = new St.BoxLayout({vertical: true, style_class: 'weather-ru-day-copy', y_align: Clutter.ActorAlign.CENTER});
            dayCopy.add_child(this._label(this._dayLabel(day.time, index), 'weather-ru-day-label'));
            dayCopy.add_child(this._label(this._formatDate(day.time), 'weather-ru-day-date'));
            row.add_child(dayCopy);
            row.add_child(this._iconActor(day.code, 32));
            const condition = this._label(this._weatherText(day.code, true), 'weather-ru-day-condition', {
                x_expand: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            condition.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            condition.clutter_text.set_line_alignment(Pango.Alignment.CENTER);
            row.add_child(condition);
            const rangeGroup = new St.BoxLayout({style_class: 'weather-ru-day-range', y_align: Clutter.ActorAlign.CENTER});
            rangeGroup.add_child(this._label(this._tempText(day.low, false), 'weather-ru-low', {y_align: Clutter.ActorAlign.CENTER}));
            const track = new St.Widget({
                style_class: 'weather-ru-range-track',
                width: DAILY_RANGE_WIDTH,
                height: 10,
                y_align: Clutter.ActorAlign.CENTER,
                layout_manager: new Clutter.FixedLayout(),
            });
            const lineY = 4;
            track.add_child(new St.Bin({
                x: 0,
                y: lineY,
                width: DAILY_RANGE_WIDTH,
                height: 3,
                style_class: 'weather-ru-range-line',
            }));
            const lowX = Math.max(0, Math.round(((day.low - min) / spread) * (DAILY_RANGE_WIDTH - 8)));
            const highX = Math.max(lowX + 8, Math.round(((day.high - min) / spread) * (DAILY_RANGE_WIDTH - 8)));
            track.add_child(new St.Bin({
                x: lowX,
                y: lineY,
                width: Math.max(8, Math.min(DAILY_RANGE_WIDTH - lowX, highX - lowX)),
                height: 3,
                style_class: 'weather-ru-range-fill',
            }));
            track.add_child(new St.Bin({
                x: Math.min(DAILY_RANGE_WIDTH - 8, highX - 4),
                y: 1,
                width: 8,
                height: 8,
                style_class: 'weather-ru-range-point',
            }));
            rangeGroup.add_child(track);
            rangeGroup.add_child(this._label(this._tempText(day.high, false), 'weather-ru-high', {y_align: Clutter.ActorAlign.CENTER}));
            row.add_child(rangeGroup);
            rows.add_child(row);
        });
        const scroll = new St.ScrollView({
            style_class: 'weather-ru-daily-scroll',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.EXTERNAL,
            enable_mouse_scrolling: true,
            child: rows,
        });
        this._dailyScroll = scroll;
        scroll.connectObject('scroll-event', () => {
            this._blurBackdrop?.queueRepaint();
            return Clutter.EVENT_PROPAGATE;
        }, this);
        box.add_child(scroll); return box;
    }

    disable() {
        this._blurLoadToken = null;
        this._roundedBlurApi = null;
        this._cancelHourlyDrag();
        this._requestId++;
        this._cancellable?.cancel();
        this._cancellable = null;
        if (this._refreshSource)
            GLib.Source.remove(this._refreshSource);
        this._refreshSource = 0;
        if (this._settingsDebounceSource)
            GLib.Source.remove(this._settingsDebounceSource);
        this._settingsDebounceSource = 0;
        if (this._blurSyncSource)
            GLib.Source.remove(this._blurSyncSource);
        this._blurSyncSource = 0;
        if (this._walletFeedbackSource)
            GLib.Source.remove(this._walletFeedbackSource);
        this._walletFeedbackSource = 0;
        this._cancelRetry();
        if (this._networkMonitor && this._networkChangedId)
            this._networkMonitor.disconnect(this._networkChangedId);
        this._networkChangedId = 0;
        this._networkMonitor = null;
        this._settings?.disconnectObject(this);
        this._indicator?.menu?.disconnectObject(this);
        this._http?.abort();
        this._http = null;
        this._clearMenu();
        this._blurBackdrop = null;
        if (this._panelIcon) {
            this._panelBox?.remove_child(this._panelIcon);
            this._panelIcon.destroy();
        }
        if (this._panelLabel) {
            this._panelBox?.remove_child(this._panelLabel);
            this._panelLabel.destroy();
        }
        if (this._panelBox) {
            this._indicator?.remove_child(this._panelBox);
            this._panelBox.destroy();
        }
        this._indicator?.destroy();
        this._indicator = null;
        this._panelBox = null;
        this._panelIcon = null;
        this._panelLabel = null;
        this._settings = null;
        this._hourly = [];
        this._daily = [];
        this._current = null;
        this._hourOffset = 0;
        this._hourScrollX = 0;
        this._hourPrevButton = null;
        this._hourNextButton = null;
        this._dailyScroll = null;
        this._metricLabels = null;
        this._menuRoot = null;
        this._menuOpen = false;
        this._walletOpen = false;
        this._expandedWalletOptions = null;
    }
}
