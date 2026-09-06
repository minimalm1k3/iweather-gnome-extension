import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const DEFAULT_BACKGROUND_BLUR = 90;
const DEFAULT_LANGUAGE = 'en';

const LANGUAGE_OPTIONS = [
    ['ru', 'Русский'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'],
    ['es', 'Español'], ['it', 'Italiano'], ['pt', 'Português'], ['pl', 'Polski'],
    ['uk', 'Українська'], ['tr', 'Türkçe — Ai перевод'], ['ar', 'العربية — Ai перевод'],
    ['hi', 'हिन्दी — Ai перевод'], ['zh', '中文 — Ai перевод'], ['ja', '日本語 — Ai перевод'],
    ['ko', '한국어 — Ai перевод'], ['vi', 'Tiếng Việt — Ai перевод'],
    ['id', 'Bahasa Indonesia — Ai перевод'], ['th', 'ไทย — Ai перевод'],
];

const PREFS_TEXT = {
    ru: {
        languageGroup: 'Язык', language: 'Язык интерфейса', languageHint: 'Переключает все подписи виджета',
        unitsGroup: 'Единицы', temperature: 'Температура', temperatureHint: 'Единицы отображения температуры',
        units: ['Цельсий (°C)', 'Фаренгейт (°F)'], locationGroup: 'Местоположение', source: 'Источник',
        sourceHint: 'Автоматически по IP или заданные координаты', sources: ['Автоматически (IP)', 'Вручную'],
        appearanceGroup: 'Внешний вид', backgroundOpacity: 'Прозрачность фона', backgroundOpacityHint: '0% — полностью прозрачно, 100% — полностью непрозрачно',
        backgroundColor: 'Цвет подложки', backgroundColorHint: 'Цвет фона виджета под размытием',
        gaussianBlur: 'Gaussian blur', gaussianBlurHint: '0% — без размытия, 100% — максимальное размытие фона',
        performanceGroup: 'Производительность', hardwareAcceleration: 'Аппаратное ускорение', hardwareAccelerationHint: 'Использовать GPU-оптимизированные иконки и отрисовку',
        latitude: 'Широта', longitude: 'Долгота', name: 'Название', refreshGroup: 'Обновление',
        clearCache: 'Очистить кеш местоположения', clearCacheHint: 'Определить местоположение заново при следующем обновлении', clear: 'Очистить',
    },
    en: {
        languageGroup: 'Language', language: 'Interface language', languageHint: 'Changes all labels in the widget',
        unitsGroup: 'Units', temperature: 'Temperature', temperatureHint: 'Temperature display units',
        units: ['Celsius (°C)', 'Fahrenheit (°F)'], locationGroup: 'Location', source: 'Source',
        sourceHint: 'Detect by IP or use specified coordinates', sources: ['Automatic (IP)', 'Manual'],
        appearanceGroup: 'Appearance', backgroundOpacity: 'Background opacity', backgroundOpacityHint: '0% — fully transparent, 100% — fully opaque',
        backgroundColor: 'Background color', backgroundColorHint: 'Widget background color under the blur',
        gaussianBlur: 'Gaussian blur', gaussianBlurHint: '0% — no blur, 100% — maximum background blur',
        performanceGroup: 'Performance', hardwareAcceleration: 'Hardware acceleration', hardwareAccelerationHint: 'Use GPU-friendly icons and rendering',
        latitude: 'Latitude', longitude: 'Longitude', name: 'Name', refreshGroup: 'Refresh',
        clearCache: 'Clear location cache', clearCacheHint: 'Detect the location again on the next refresh', clear: 'Clear',
    },
    de: {
        languageGroup: 'Sprache', language: 'Oberflächensprache', languageHint: 'Ändert alle Beschriftungen des Widgets', unitsGroup: 'Einheiten', temperature: 'Temperatur', temperatureHint: 'Einheit der Temperaturanzeige', units: ['Celsius (°C)', 'Fahrenheit (°F)'], locationGroup: 'Standort', source: 'Quelle', sourceHint: 'Per IP erkennen oder Koordinaten verwenden', sources: ['Automatisch (IP)', 'Manuell'], appearanceGroup: 'Erscheinungsbild', backgroundOpacity: 'Hintergrunddeckkraft', backgroundOpacityHint: '0 % — transparent, 100 % — undurchsichtig', backgroundColor: 'Hintergrundfarbe', backgroundColorHint: 'Widgetfarbe unter der Unschärfe', gaussianBlur: 'Gaußsche Unschärfe', gaussianBlurHint: '0 % — keine, 100 % — maximale Unschärfe', performanceGroup: 'Leistung', hardwareAcceleration: 'Hardwarebeschleunigung', hardwareAccelerationHint: 'GPU-optimierte Symbole und Darstellung verwenden', latitude: 'Breitengrad', longitude: 'Längengrad', name: 'Name', refreshGroup: 'Aktualisierung', clearCache: 'Standortcache leeren', clearCacheHint: 'Standort bei der nächsten Aktualisierung neu bestimmen', clear: 'Leeren',
    },
    fr: {
        languageGroup: 'Langue', language: 'Langue de l’interface', languageHint: 'Modifie tous les libellés du widget', unitsGroup: 'Unités', temperature: 'Température', temperatureHint: 'Unité d’affichage de la température', units: ['Celsius (°C)', 'Fahrenheit (°F)'], locationGroup: 'Emplacement', source: 'Source', sourceHint: 'Détecter par IP ou utiliser des coordonnées', sources: ['Automatique (IP)', 'Manuel'], appearanceGroup: 'Apparence', backgroundOpacity: 'Opacité du fond', backgroundOpacityHint: '0 % — transparent, 100 % — opaque', backgroundColor: 'Couleur du fond', backgroundColorHint: 'Couleur du widget sous le flou', gaussianBlur: 'Flou gaussien', gaussianBlurHint: '0 % — aucun flou, 100 % — flou maximal', performanceGroup: 'Performances', hardwareAcceleration: 'Accélération matérielle', hardwareAccelerationHint: 'Utiliser les icônes et le rendu optimisés GPU', latitude: 'Latitude', longitude: 'Longitude', name: 'Nom', refreshGroup: 'Actualisation', clearCache: 'Vider le cache de localisation', clearCacheHint: 'Redétecter l’emplacement à la prochaine actualisation', clear: 'Vider',
    },
    es: {
        languageGroup: 'Idioma', language: 'Idioma de la interfaz', languageHint: 'Cambia todas las etiquetas del widget', unitsGroup: 'Unidades', temperature: 'Temperatura', temperatureHint: 'Unidad de temperatura', units: ['Celsius (°C)', 'Fahrenheit (°F)'], locationGroup: 'Ubicación', source: 'Fuente', sourceHint: 'Detectar por IP o usar coordenadas', sources: ['Automático (IP)', 'Manual'], appearanceGroup: 'Apariencia', backgroundOpacity: 'Opacidad del fondo', backgroundOpacityHint: '0 % — transparente, 100 % — opaco', backgroundColor: 'Color de fondo', backgroundColorHint: 'Color del widget bajo el desenfoque', gaussianBlur: 'Desenfoque gaussiano', gaussianBlurHint: '0 % — sin desenfoque, 100 % — máximo', performanceGroup: 'Rendimiento', hardwareAcceleration: 'Aceleración de hardware', hardwareAccelerationHint: 'Usar iconos y renderizado optimizados para GPU', latitude: 'Latitud', longitude: 'Longitud', name: 'Nombre', refreshGroup: 'Actualización', clearCache: 'Borrar caché de ubicación', clearCacheHint: 'Detectar de nuevo en la próxima actualización', clear: 'Borrar',
    },
    it: {
        languageGroup: 'Lingua', language: 'Lingua dell’interfaccia', languageHint: 'Cambia tutte le etichette del widget', unitsGroup: 'Unità', temperature: 'Temperatura', temperatureHint: 'Unità di visualizzazione', units: ['Celsius (°C)', 'Fahrenheit (°F)'], locationGroup: 'Posizione', source: 'Origine', sourceHint: 'Rileva tramite IP o usa coordinate', sources: ['Automatica (IP)', 'Manuale'], appearanceGroup: 'Aspetto', backgroundOpacity: 'Opacità sfondo', backgroundOpacityHint: '0% — trasparente, 100% — opaco', backgroundColor: 'Colore sfondo', backgroundColorHint: 'Colore del widget sotto la sfocatura', gaussianBlur: 'Sfocatura gaussiana', gaussianBlurHint: '0% — nessuna, 100% — massima', performanceGroup: 'Prestazioni', hardwareAcceleration: 'Accelerazione hardware', hardwareAccelerationHint: 'Usa icone e rendering ottimizzati GPU', latitude: 'Latitudine', longitude: 'Longitudine', name: 'Nome', refreshGroup: 'Aggiornamento', clearCache: 'Cancella cache posizione', clearCacheHint: 'Rileva nuovamente al prossimo aggiornamento', clear: 'Cancella',
    },
    pt: {
        languageGroup: 'Idioma', language: 'Idioma da interface', languageHint: 'Altera todos os textos do widget', unitsGroup: 'Unidades', temperature: 'Temperatura', temperatureHint: 'Unidade de temperatura', units: ['Celsius (°C)', 'Fahrenheit (°F)'], locationGroup: 'Localização', source: 'Fonte', sourceHint: 'Detectar por IP ou usar coordenadas', sources: ['Automático (IP)', 'Manual'], appearanceGroup: 'Aparência', backgroundOpacity: 'Opacidade do fundo', backgroundOpacityHint: '0% — transparente, 100% — opaco', backgroundColor: 'Cor do fundo', backgroundColorHint: 'Cor do widget sob o desfoque', gaussianBlur: 'Desfoque gaussiano', gaussianBlurHint: '0% — sem desfoque, 100% — máximo', performanceGroup: 'Desempenho', hardwareAcceleration: 'Aceleração de hardware', hardwareAccelerationHint: 'Usar ícones e renderização otimizados para GPU', latitude: 'Latitude', longitude: 'Longitude', name: 'Nome', refreshGroup: 'Atualização', clearCache: 'Limpar cache de localização', clearCacheHint: 'Detectar novamente na próxima atualização', clear: 'Limpar',
    },
    pl: {
        languageGroup: 'Język', language: 'Język interfejsu', languageHint: 'Zmienia wszystkie etykiety widżetu', unitsGroup: 'Jednostki', temperature: 'Temperatura', temperatureHint: 'Jednostka temperatury', units: ['Celsjusz (°C)', 'Fahrenheit (°F)'], locationGroup: 'Lokalizacja', source: 'Źródło', sourceHint: 'Wykryj przez IP lub użyj współrzędnych', sources: ['Automatycznie (IP)', 'Ręcznie'], appearanceGroup: 'Wygląd', backgroundOpacity: 'Krycie tła', backgroundOpacityHint: '0% — przezroczyste, 100% — nieprzezroczyste', backgroundColor: 'Kolor tła', backgroundColorHint: 'Kolor widżetu pod rozmyciem', gaussianBlur: 'Rozmycie Gaussa', gaussianBlurHint: '0% — brak, 100% — maksymalne', performanceGroup: 'Wydajność', hardwareAcceleration: 'Przyspieszenie sprzętowe', hardwareAccelerationHint: 'Używaj ikon i renderowania zoptymalizowanych dla GPU', latitude: 'Szerokość geogr.', longitude: 'Długość geogr.', name: 'Nazwa', refreshGroup: 'Odświeżanie', clearCache: 'Wyczyść pamięć lokalizacji', clearCacheHint: 'Wykryj lokalizację ponownie przy następnym odświeżeniu', clear: 'Wyczyść',
    },
    uk: {
        languageGroup: 'Мова', language: 'Мова інтерфейсу', languageHint: 'Змінює всі написи віджета', unitsGroup: 'Одиниці', temperature: 'Температура', temperatureHint: 'Одиниці температури', units: ['Цельсій (°C)', 'Фаренгейт (°F)'], locationGroup: 'Місцезнаходження', source: 'Джерело', sourceHint: 'Визначити за IP або використати координати', sources: ['Автоматично (IP)', 'Вручну'], appearanceGroup: 'Вигляд', backgroundOpacity: 'Прозорість фону', backgroundOpacityHint: '0% — прозоро, 100% — непрозоро', backgroundColor: 'Колір фону', backgroundColorHint: 'Колір віджета під розмиттям', gaussianBlur: 'Розмиття Гауса', gaussianBlurHint: '0% — без розмиття, 100% — максимум', performanceGroup: 'Продуктивність', hardwareAcceleration: 'Апаратне прискорення', hardwareAccelerationHint: 'Використовувати GPU-оптимізовані значки й рендеринг', latitude: 'Широта', longitude: 'Довгота', name: 'Назва', refreshGroup: 'Оновлення', clearCache: 'Очистити кеш місцезнаходження', clearCacheHint: 'Визначити місце знову при наступному оновленні', clear: 'Очистити',
    },
    tr: {
        languageGroup: 'Dil', language: 'Arayüz dili', languageHint: 'Widget üzerindeki tüm etiketleri değiştirir', unitsGroup: 'Birimler', temperature: 'Sıcaklık', temperatureHint: 'Sıcaklık görüntüleme birimi', units: ['Santigrat (°C)', 'Fahrenhayt (°F)'], locationGroup: 'Konum', source: 'Kaynak', sourceHint: 'IP ile algıla veya koordinat kullan', sources: ['Otomatik (IP)', 'Elle'], appearanceGroup: 'Görünüm', backgroundOpacity: 'Arka plan opaklığı', backgroundOpacityHint: '%0 — saydam, %100 — opak', backgroundColor: 'Arka plan rengi', backgroundColorHint: 'Bulanıklığın altındaki widget rengi', gaussianBlur: 'Gauss bulanıklığı', gaussianBlurHint: '%0 — yok, %100 — en yüksek', performanceGroup: 'Performans', hardwareAcceleration: 'Donanım hızlandırma', hardwareAccelerationHint: 'GPU uyumlu simgeler ve işleme kullan', latitude: 'Enlem', longitude: 'Boylam', name: 'Ad', refreshGroup: 'Yenileme', clearCache: 'Konum önbelleğini temizle', clearCacheHint: 'Sonraki yenilemede konumu yeniden algıla', clear: 'Temizle',
    },
    ar: {
        languageGroup: 'اللغة', language: 'لغة الواجهة', languageHint: 'تغيير جميع نصوص الأداة', unitsGroup: 'الوحدات', temperature: 'درجة الحرارة', temperatureHint: 'وحدة عرض درجة الحرارة', units: ['مئوية (°C)', 'فهرنهايت (°F)'], locationGroup: 'الموقع', source: 'المصدر', sourceHint: 'الكشف عبر IP أو استخدام الإحداثيات', sources: ['تلقائي (IP)', 'يدوي'], appearanceGroup: 'المظهر', backgroundOpacity: 'عتامة الخلفية', backgroundOpacityHint: '0% شفاف، 100% معتم', backgroundColor: 'لون الخلفية', backgroundColorHint: 'لون الأداة تحت التمويه', gaussianBlur: 'تمويه غاوسي', gaussianBlurHint: '0% بلا تمويه، 100% أقصى تمويه', performanceGroup: 'الأداء', hardwareAcceleration: 'تسريع الأجهزة', hardwareAccelerationHint: 'استخدام رموز وعرض محسّن لوحدة GPU', latitude: 'خط العرض', longitude: 'خط الطول', name: 'الاسم', refreshGroup: 'التحديث', clearCache: 'مسح ذاكرة الموقع', clearCacheHint: 'إعادة اكتشاف الموقع عند التحديث التالي', clear: 'مسح',
    },
    hi: {
        languageGroup: 'भाषा', language: 'इंटरफ़ेस भाषा', languageHint: 'विजेट के सभी लेबल बदलता है', unitsGroup: 'इकाइयाँ', temperature: 'तापमान', temperatureHint: 'तापमान की इकाई', units: ['सेल्सियस (°C)', 'फ़ारेनहाइट (°F)'], locationGroup: 'स्थान', source: 'स्रोत', sourceHint: 'IP से पहचानें या निर्देशांक उपयोग करें', sources: ['स्वचालित (IP)', 'मैनुअल'], appearanceGroup: 'दिखावट', backgroundOpacity: 'पृष्ठभूमि अपारदर्शिता', backgroundOpacityHint: '0% पारदर्शी, 100% अपारदर्शी', backgroundColor: 'पृष्ठभूमि रंग', backgroundColorHint: 'धुंधलेपन के नीचे विजेट का रंग', gaussianBlur: 'गॉसियन ब्लर', gaussianBlurHint: '0% बिना ब्लर, 100% अधिकतम', performanceGroup: 'प्रदर्शन', hardwareAcceleration: 'हार्डवेयर त्वरण', hardwareAccelerationHint: 'GPU-अनुकूल आइकन और रेंडरिंग उपयोग करें', latitude: 'अक्षांश', longitude: 'देशांतर', name: 'नाम', refreshGroup: 'अपडेट', clearCache: 'स्थान कैश साफ़ करें', clearCacheHint: 'अगले अपडेट पर स्थान फिर पहचानें', clear: 'साफ़ करें',
    },
    zh: {
        languageGroup: '语言', language: '界面语言', languageHint: '更改小组件中的所有文字', unitsGroup: '单位', temperature: '温度', temperatureHint: '温度显示单位', units: ['摄氏度 (°C)', '华氏度 (°F)'], locationGroup: '位置', source: '来源', sourceHint: '通过 IP 检测或使用坐标', sources: ['自动 (IP)', '手动'], appearanceGroup: '外观', backgroundOpacity: '背景不透明度', backgroundOpacityHint: '0% 完全透明，100% 完全不透明', backgroundColor: '背景颜色', backgroundColorHint: '模糊效果下的小组件颜色', gaussianBlur: '高斯模糊', gaussianBlurHint: '0% 无模糊，100% 最大模糊', performanceGroup: '性能', hardwareAcceleration: '硬件加速', hardwareAccelerationHint: '使用 GPU 优化的图标和渲染', latitude: '纬度', longitude: '经度', name: '名称', refreshGroup: '刷新', clearCache: '清除位置缓存', clearCacheHint: '下次刷新时重新检测位置', clear: '清除',
    },
    ja: {
        languageGroup: '言語', language: 'インターフェース言語', languageHint: 'ウィジェットのすべての表示を変更します', unitsGroup: '単位', temperature: '気温', temperatureHint: '気温の表示単位', units: ['摂氏 (°C)', '華氏 (°F)'], locationGroup: '場所', source: '取得元', sourceHint: 'IPで検出または座標を使用', sources: ['自動 (IP)', '手動'], appearanceGroup: '外観', backgroundOpacity: '背景の不透明度', backgroundOpacityHint: '0% 透明、100% 不透明', backgroundColor: '背景色', backgroundColorHint: 'ぼかしの下のウィジェット色', gaussianBlur: 'ガウスぼかし', gaussianBlurHint: '0% なし、100% 最大', performanceGroup: 'パフォーマンス', hardwareAcceleration: 'ハードウェアアクセラレーション', hardwareAccelerationHint: 'GPU向けアイコンと描画を使用', latitude: '緯度', longitude: '経度', name: '名前', refreshGroup: '更新', clearCache: '場所のキャッシュを消去', clearCacheHint: '次回更新時に場所を再検出', clear: '消去',
    },
    ko: {
        languageGroup: '언어', language: '인터페이스 언어', languageHint: '위젯의 모든 문구를 변경합니다', unitsGroup: '단위', temperature: '온도', temperatureHint: '온도 표시 단위', units: ['섭씨 (°C)', '화씨 (°F)'], locationGroup: '위치', source: '소스', sourceHint: 'IP로 감지하거나 좌표 사용', sources: ['자동 (IP)', '수동'], appearanceGroup: '모양', backgroundOpacity: '배경 불투명도', backgroundOpacityHint: '0% 투명, 100% 불투명', backgroundColor: '배경색', backgroundColorHint: '흐림 아래의 위젯 색상', gaussianBlur: '가우시안 블러', gaussianBlurHint: '0% 없음, 100% 최대', performanceGroup: '성능', hardwareAcceleration: '하드웨어 가속', hardwareAccelerationHint: 'GPU 최적화 아이콘과 렌더링 사용', latitude: '위도', longitude: '경도', name: '이름', refreshGroup: '새로고침', clearCache: '위치 캐시 지우기', clearCacheHint: '다음 새로고침에서 위치 다시 감지', clear: '지우기',
    },
    vi: {
        languageGroup: 'Ngôn ngữ', language: 'Ngôn ngữ giao diện', languageHint: 'Thay đổi toàn bộ nhãn của tiện ích', unitsGroup: 'Đơn vị', temperature: 'Nhiệt độ', temperatureHint: 'Đơn vị hiển thị nhiệt độ', units: ['Độ C (°C)', 'Độ F (°F)'], locationGroup: 'Vị trí', source: 'Nguồn', sourceHint: 'Nhận diện qua IP hoặc dùng tọa độ', sources: ['Tự động (IP)', 'Thủ công'], appearanceGroup: 'Giao diện', backgroundOpacity: 'Độ mờ nền', backgroundOpacityHint: '0% trong suốt, 100% đục', backgroundColor: 'Màu nền', backgroundColorHint: 'Màu tiện ích dưới lớp làm mờ', gaussianBlur: 'Làm mờ Gaussian', gaussianBlurHint: '0% không mờ, 100% tối đa', performanceGroup: 'Hiệu suất', hardwareAcceleration: 'Tăng tốc phần cứng', hardwareAccelerationHint: 'Dùng biểu tượng và kết xuất tối ưu GPU', latitude: 'Vĩ độ', longitude: 'Kinh độ', name: 'Tên', refreshGroup: 'Làm mới', clearCache: 'Xóa bộ nhớ vị trí', clearCacheHint: 'Nhận diện lại vị trí ở lần làm mới sau', clear: 'Xóa',
    },
    id: {
        languageGroup: 'Bahasa', language: 'Bahasa antarmuka', languageHint: 'Mengubah semua label widget', unitsGroup: 'Satuan', temperature: 'Suhu', temperatureHint: 'Satuan tampilan suhu', units: ['Celsius (°C)', 'Fahrenheit (°F)'], locationGroup: 'Lokasi', source: 'Sumber', sourceHint: 'Deteksi lewat IP atau gunakan koordinat', sources: ['Otomatis (IP)', 'Manual'], appearanceGroup: 'Tampilan', backgroundOpacity: 'Opasitas latar', backgroundOpacityHint: '0% transparan, 100% buram', backgroundColor: 'Warna latar', backgroundColorHint: 'Warna widget di bawah blur', gaussianBlur: 'Blur Gaussian', gaussianBlurHint: '0% tanpa blur, 100% maksimum', performanceGroup: 'Performa', hardwareAcceleration: 'Akselerasi perangkat keras', hardwareAccelerationHint: 'Gunakan ikon dan rendering ramah GPU', latitude: 'Lintang', longitude: 'Bujur', name: 'Nama', refreshGroup: 'Segarkan', clearCache: 'Bersihkan cache lokasi', clearCacheHint: 'Deteksi lokasi lagi saat penyegaran berikutnya', clear: 'Bersihkan',
    },
    th: {
        languageGroup: 'ภาษา', language: 'ภาษาของอินเทอร์เฟซ', languageHint: 'เปลี่ยนข้อความทั้งหมดในวิดเจ็ต', unitsGroup: 'หน่วย', temperature: 'อุณหภูมิ', temperatureHint: 'หน่วยแสดงอุณหภูมิ', units: ['เซลเซียส (°C)', 'ฟาเรนไฮต์ (°F)'], locationGroup: 'ตำแหน่ง', source: 'แหล่งข้อมูล', sourceHint: 'ตรวจจับด้วย IP หรือใช้พิกัด', sources: ['อัตโนมัติ (IP)', 'กำหนดเอง'], appearanceGroup: 'ลักษณะ', backgroundOpacity: 'ความทึบพื้นหลัง', backgroundOpacityHint: '0% โปร่งใส, 100% ทึบ', backgroundColor: 'สีพื้นหลัง', backgroundColorHint: 'สีวิดเจ็ตใต้เอฟเฟกต์เบลอ', gaussianBlur: 'เบลอแบบเกาส์เซียน', gaussianBlurHint: '0% ไม่เบลอ, 100% สูงสุด', performanceGroup: 'ประสิทธิภาพ', hardwareAcceleration: 'การเร่งด้วยฮาร์ดแวร์', hardwareAccelerationHint: 'ใช้ไอคอนและการแสดงผลที่เหมาะกับ GPU', latitude: 'ละติจูด', longitude: 'ลองจิจูด', name: 'ชื่อ', refreshGroup: 'รีเฟรช', clearCache: 'ล้างแคชตำแหน่ง', clearCacheHint: 'ตรวจหาตำแหน่งใหม่ในการรีเฟรชครั้งถัดไป', clear: 'ล้าง',
    },
};

export default class WeatherRuPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.default_width = 500;
        window.default_height = 520;
        const settings = this.getSettings();
        let applyLanguage = () => {};
        const page = new Adw.PreferencesPage();
        window.add(page);

        const languageGroup = new Adw.PreferencesGroup();
        page.add(languageGroup);
        const storedLanguage = settings.get_string('language');
        const storedLanguageIndex = LANGUAGE_OPTIONS.findIndex(([code]) => code === storedLanguage);
        const languageRow = new Adw.ComboRow({
            model: Gtk.StringList.new(LANGUAGE_OPTIONS.map(([, label]) => label)),
            selected: storedLanguageIndex >= 0 ? storedLanguageIndex : 0,
        });
        languageRow.connect('notify::selected', () => {
            const value = LANGUAGE_OPTIONS[languageRow.selected]?.[0] ?? DEFAULT_LANGUAGE;
            if (settings.get_string('language') !== value)
                settings.set_string('language', value);
            applyLanguage();
        });
        languageGroup.add(languageRow);

        const unitsGroup = new Adw.PreferencesGroup();
        page.add(unitsGroup);
        const unitRow = new Adw.ComboRow({
            model: Gtk.StringList.new(['Цельсий (°C)', 'Фаренгейт (°F)']),
            selected: settings.get_string('temperature-unit') === 'fahrenheit' ? 1 : 0,
        });
        unitRow.connect('notify::selected', () => {
            const value = unitRow.selected === 1 ? 'fahrenheit' : 'celsius';
            if (settings.get_string('temperature-unit') !== value)
                settings.set_string('temperature-unit', value);
        });
        unitsGroup.add(unitRow);

        const appearanceGroup = new Adw.PreferencesGroup();
        page.add(appearanceGroup);
        const opacityRow = new Adw.ActionRow();
        const storedOpacity = settings.get_int('background-opacity');
        const initialOpacity = Number.isFinite(storedOpacity)
            ? Math.max(0, Math.min(100, Math.round(storedOpacity)))
            : 60;
        const opacityScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
                page_increment: 10,
                value: initialOpacity,
            }),
            draw_value: false,
            digits: 0,
            width_request: 190,
            valign: Gtk.Align.CENTER,
        });
        const opacityValue = new Gtk.Label({
            label: `${initialOpacity}%`,
            width_chars: 4,
            xalign: 1,
            valign: Gtk.Align.CENTER,
        });
        opacityScale.connect('value-changed', () => {
            const scaleValue = opacityScale.get_value();
            const opacity = Number.isFinite(scaleValue)
                ? Math.max(0, Math.min(100, Math.round(scaleValue)))
                : 60;
            opacityValue.label = `${opacity}%`;
            if (settings.get_int('background-opacity') !== opacity)
                settings.set_int('background-opacity', opacity);
        });
        opacityRow.add_suffix(opacityScale);
        opacityRow.add_suffix(opacityValue);
        appearanceGroup.add(opacityRow);

        const parseBackgroundColor = () => {
            const color = new Gdk.RGBA();
            if (!color.parse(settings.get_string('background-color')))
                color.parse('#1f2640');
            return color;
        };
        const colorToHex = (color) => {
            const channel = value => Math.round(Math.max(0, Math.min(1, value)) * 255)
                .toString(16).padStart(2, '0');
            return `#${channel(color.red)}${channel(color.green)}${channel(color.blue)}`;
        };
        const colorButton = new Gtk.ColorDialogButton({
            dialog: new Gtk.ColorDialog({with_alpha: false}),
            rgba: parseBackgroundColor(),
            width_request: 44,
            valign: Gtk.Align.CENTER,
        });
        colorButton.connect('notify::rgba', () => {
            const value = colorToHex(colorButton.rgba);
            if (settings.get_string('background-color') !== value)
                settings.set_string('background-color', value);
        });
        const colorRow = new Adw.ActionRow();
        colorRow.add_suffix(colorButton);
        appearanceGroup.add(colorRow);

        const blurRow = new Adw.ActionRow();
        const storedBlur = settings.get_int('background-blur');
        const initialBlur = Number.isFinite(storedBlur)
            ? Math.max(0, Math.min(100, Math.round(storedBlur)))
            : DEFAULT_BACKGROUND_BLUR;
        const blurScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
                page_increment: 10,
                value: initialBlur,
            }),
            draw_value: false,
            digits: 0,
            width_request: 190,
            valign: Gtk.Align.CENTER,
        });
        const blurValue = new Gtk.Label({
            label: `${initialBlur}%`,
            width_chars: 4,
            xalign: 1,
            valign: Gtk.Align.CENTER,
        });
        blurScale.connect('value-changed', () => {
            const scaleValue = blurScale.get_value();
            const blur = Number.isFinite(scaleValue)
                ? Math.max(0, Math.min(100, Math.round(scaleValue)))
                : DEFAULT_BACKGROUND_BLUR;
            blurValue.label = `${blur}%`;
            if (settings.get_int('background-blur') !== blur)
                settings.set_int('background-blur', blur);
        });
        blurRow.add_suffix(blurScale);
        blurRow.add_suffix(blurValue);
        appearanceGroup.add(blurRow);

        const performanceGroup = new Adw.PreferencesGroup();
        page.add(performanceGroup);
        const hardwareRow = new Adw.SwitchRow({
            active: settings.get_boolean('hardware-acceleration'),
        });
        hardwareRow.connect('notify::active', () => {
            if (settings.get_boolean('hardware-acceleration') !== hardwareRow.active)
                settings.set_boolean('hardware-acceleration', hardwareRow.active);
        });
        performanceGroup.add(hardwareRow);

        const locationGroup = new Adw.PreferencesGroup();
        page.add(locationGroup);
        const sourceRow = new Adw.ComboRow({
            model: Gtk.StringList.new(['Автоматически (IP)', 'Вручную / Manual']),
            selected: settings.get_string('location-mode') === 'manual' ? 1 : 0,
        });
        locationGroup.add(sourceRow);
        const latRow = new Adw.SpinRow({
            adjustment: new Gtk.Adjustment({lower: -90, upper: 90, step_increment: 0.01, page_increment: 1, value: settings.get_double('manual-latitude')}),
            digits: 4,
        });
        const lonRow = new Adw.SpinRow({
            adjustment: new Gtk.Adjustment({lower: -180, upper: 180, step_increment: 0.01, page_increment: 1, value: settings.get_double('manual-longitude')}),
            digits: 4,
        });
        const nameRow = new Adw.EntryRow({text: settings.get_string('manual-location-name')});
        [latRow, lonRow, nameRow].forEach((row) => locationGroup.add(row));
        const setVisible = () => { const visible = sourceRow.selected === 1; latRow.visible = visible; lonRow.visible = visible; nameRow.visible = visible; };
        sourceRow.connect('notify::selected', () => {
            const value = sourceRow.selected === 1 ? 'manual' : 'auto';
            if (settings.get_string('location-mode') !== value)
                settings.set_string('location-mode', value);
            setVisible();
        });
        latRow.connect('notify::value', () => settings.set_double('manual-latitude', latRow.value));
        lonRow.connect('notify::value', () => settings.set_double('manual-longitude', lonRow.value));
        nameRow.connect('notify::text', () => settings.set_string('manual-location-name', nameRow.text));
        setVisible();

        const refreshGroup = new Adw.PreferencesGroup();
        page.add(refreshGroup);
        const refreshRow = new Adw.ActionRow();
        const refreshButton = new Gtk.Button({valign: Gtk.Align.CENTER});
        refreshButton.connect('clicked', () => settings.set_string('location-cache', ''));
        refreshRow.add_suffix(refreshButton); refreshGroup.add(refreshRow);

        applyLanguage = () => {
            const language = settings.get_string('language');
        const text = PREFS_TEXT[language] ?? PREFS_TEXT[DEFAULT_LANGUAGE];
            languageGroup.title = text.languageGroup;
            languageRow.title = text.language;
            languageRow.subtitle = text.languageHint;
            unitsGroup.title = text.unitsGroup;
            unitRow.title = text.temperature;
            unitRow.subtitle = text.temperatureHint;
            const unitSelection = unitRow.selected;
            unitRow.model = Gtk.StringList.new(text.units);
            unitRow.selected = unitSelection;
            appearanceGroup.title = text.appearanceGroup;
            opacityRow.title = text.backgroundOpacity;
            opacityRow.subtitle = text.backgroundOpacityHint;
            colorRow.title = text.backgroundColor;
            colorRow.subtitle = text.backgroundColorHint;
            blurRow.title = text.gaussianBlur;
            blurRow.subtitle = text.gaussianBlurHint;
            performanceGroup.title = text.performanceGroup;
            hardwareRow.title = text.hardwareAcceleration;
            hardwareRow.subtitle = text.hardwareAccelerationHint;
            locationGroup.title = text.locationGroup;
            sourceRow.title = text.source;
            sourceRow.subtitle = text.sourceHint;
            const sourceSelection = sourceRow.selected;
            sourceRow.model = Gtk.StringList.new(text.sources);
            sourceRow.selected = sourceSelection;
            latRow.title = text.latitude;
            lonRow.title = text.longitude;
            nameRow.title = text.name;
            refreshGroup.title = text.refreshGroup;
            refreshRow.title = text.clearCache;
            refreshRow.subtitle = text.clearCacheHint;
            refreshButton.label = text.clear;
        };
        applyLanguage();

    }
}
