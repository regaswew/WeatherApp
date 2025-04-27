// Конфигурация
const OPENWEATHER_API_KEY = 'd6eb7afea452af0fb5f02abd642bba48';
const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';

// Состояние приложения
let currentUser = null;
let favorites = {};
let map = null;
let mapLayers = {
    base: null,
    satellite: null,
    terrain: null
};
let routeLayer = null;
let watchId = null;

// DOM элементы
let pages;
let navLinks;
let loginBtn;
let registerBtn;
let logoutBtn;
let loginModal;
let registerModal;
let closeButtons;
let weatherContainer;
let forecastContainer;
let favoritesContainer;
let searchForm;
let citySearch;
let searchBtn;
let routeFrom;
let routeTo;
let findRouteBtn;
let useGPSBtn;
let routeInfoElement;

// Получаем элементы страницы
const weatherInfo = document.getElementById('weatherInfo');
const forecastInfo = document.getElementById('forecastInfo');

// Route building functionality
let routeLine = null;
let routeMarkers = [];
let routeInfo = null;

// Добавляем новые переменные для поиска городов
let citySearchMap;
let searchCityBtn;
let searchResults;
let searchTimeout;

// Инициализация DOM элементов
function initializeDOMElements() {
    pages = document.querySelectorAll('.page');
    navLinks = document.querySelectorAll('.nav-links a');
    loginBtn = document.getElementById('loginBtn');
    registerBtn = document.getElementById('registerBtn');
    logoutBtn = document.getElementById('logoutBtn');
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');
    closeButtons = document.querySelectorAll('.close');
    weatherContainer = document.querySelector('.weather-container');
    forecastContainer = document.querySelector('.forecast-container');
    favoritesContainer = document.querySelector('.favorites-container');
    searchForm = document.getElementById('searchForm');
    citySearch = document.getElementById('citySearch');
    searchBtn = document.getElementById('searchBtn');
    
    // Initialize route controls
    routeFrom = document.getElementById('routeFrom');
    routeTo = document.getElementById('routeTo');
    findRouteBtn = document.getElementById('findRoute');
    useGPSBtn = document.getElementById('useGPS');
    routeInfoElement = document.getElementById('routeInfo');
    
    // Initialize route info element
    if (routeInfoElement) {
        routeInfoElement.classList.add('collapsed');
        routeInfoElement.addEventListener('click', () => {
            routeInfoElement.classList.toggle('collapsed');
            routeInfoElement.classList.toggle('expanded');
        });
        routeInfoElement.hasClickHandler = true;
    }
    
    // Set placeholders for route inputs
    if (routeFrom && routeTo) {
        routeFrom.placeholder = "Откуда (адрес или координаты)";
        routeTo.placeholder = "Куда (адрес или координаты)";
    }

    // Initialize city search elements
    citySearchMap = document.getElementById('citySearchMap');
    searchCityBtn = document.getElementById('searchCityBtn');
    searchResults = document.getElementById('searchResults');
    
    // Setup city search functionality
    setupCitySearch();
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем DOM элементы
    initializeDOMElements();
    
    // Проверяем авторизацию
    checkAuth();
    
    // Инициализируем карту
    initializeMap();
    
    // Устанавливаем обработчики событий
    setupEventListeners();
    
    // Setup route controls
    setupRouteControls();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация
    navLinks.forEach(link => {
        if (link.dataset.page) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showPage(link.dataset.page);
            });
        }
    });

    // Модальные окна
    loginBtn.addEventListener('click', () => showModal(loginModal));
    registerBtn.addEventListener('click', () => showModal(registerModal));
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
        });
    });

    // Формы
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);

    // Поиск погоды
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (citySearch && citySearch.value.trim()) {
                searchWeather(citySearch.value.trim());
            }
        });
    }

    // Добавляем обработчик нажатия Enter в поле ввода
    if (citySearch) {
        citySearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (citySearch.value.trim()) {
                    searchWeather(citySearch.value.trim());
                }
            }
        });
    }
}

// Функции навигации
function showPage(pageId) {
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === pageId) {
            page.classList.add('active');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
}

function showModal(modal) {
    modal.style.display = 'block';
}

// Функции авторизации
function checkAuth() {
    const user = localStorage.getItem('user');
    if (user) {
        currentUser = JSON.parse(user);
        updateAuthUI(true);
        loadFavorites(); // Загружаем избранное при входе
    }
}

function updateAuthUI(isLoggedIn) {
    loginBtn.style.display = isLoggedIn ? 'none' : 'inline';
    registerBtn.style.display = isLoggedIn ? 'none' : 'inline';
    logoutBtn.style.display = isLoggedIn ? 'inline' : 'none';
    
    // Показываем/скрываем избранное в зависимости от авторизации
    const favoritesSection = document.querySelector('.favorites-section');
    if (favoritesSection) {
        favoritesSection.style.display = isLoggedIn ? 'block' : 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    if (email && password) {
        currentUser = { email };
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateAuthUI(true);
        loginModal.style.display = 'none';
        form.reset();
        loadFavorites(); // Загружаем избранное после входа
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    if (name && email && password) {
        currentUser = { name, email };
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateAuthUI(true);
        registerModal.style.display = 'none';
        form.reset();
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('user');
    localStorage.removeItem('favorites'); // Очищаем избранное при выходе
    favorites = {};
    updateAuthUI(false);
    displayFavorites(); // Обновляем отображение избранного
}

// Инициализация карты
function initializeMap() {
    // Создаем базовый слой карты
    mapLayers.base = new ol.layer.Tile({
        source: new ol.source.OSM(),
        visible: true
    });

    // Создаем спутниковый слой
    mapLayers.satellite = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attributions: '© Esri'
        }),
        visible: false
    });

    // Создаем слой рельефа
    mapLayers.terrain = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attributions: '© OpenTopoMap'
        }),
        visible: false
    });

    // Создаем векторный слой для маршрута
    routeLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#4CAF50',
                width: 4
            })
        })
    });

    // Инициализируем карту
    map = new ol.Map({
        target: 'weatherMap',
        layers: [...Object.values(mapLayers), routeLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([37.6173, 55.7558]), // Москва
            zoom: 10
        })
    });

    // Добавляем обработчики для кнопок переключения карт
    setupMapControls();
}

// Настройка элементов управления картой
function setupMapControls() {
    const mapControls = document.querySelectorAll('.map-control-btn');
    
    mapControls.forEach(control => {
        control.addEventListener('click', () => {
            mapControls.forEach(btn => btn.classList.remove('active'));
            control.classList.add('active');

            const mapType = control.dataset.type;
            
            // Сначала скрываем все слои
            Object.values(mapLayers).forEach(layer => {
                layer.setVisible(false);
            });

            // Затем показываем выбранный слой
            mapLayers[mapType].setVisible(true);
        });
    });
}

// Обновляем функцию searchWeather
async function searchWeather(city) {
    if (!city) {
        alert('Пожалуйста, введите название города');
        return;
    }

    try {
        console.log('Searching weather for:', city);

        // Получаем текущую погоду
        const currentWeatherResponse = await fetch(
            `${OPENWEATHER_API_URL}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ru`
        );
        
        if (!currentWeatherResponse.ok) {
            throw new Error(`HTTP error! status: ${currentWeatherResponse.status}`);
        }
        
        const currentWeatherData = await currentWeatherResponse.json();
        console.log('Current weather data:', currentWeatherData);

        if (currentWeatherData.cod === '404') {
            throw new Error('Город не найден');
        }

        if (!currentWeatherData.main || !currentWeatherData.weather) {
            throw new Error('Неверный формат данных о погоде');
        }

        // Обновляем центр карты на найденный город
        if (map) {
            const coordinates = ol.proj.fromLonLat([currentWeatherData.coord.lon, currentWeatherData.coord.lat]);
            map.getView().animate({
                center: coordinates,
                zoom: 8,
                duration: 1000
            });
        }

        // Получаем прогноз на 5 дней
        const forecastResponse = await fetch(
            `${OPENWEATHER_API_URL}/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ru`
        );
        
        if (!forecastResponse.ok) {
            throw new Error(`HTTP error! status: ${forecastResponse.status}`);
        }
        
        const forecastData = await forecastResponse.json();
        console.log('Forecast data:', forecastData);

        if (!forecastData.list) {
            throw new Error('Неверный формат данных прогноза');
        }

        // Показываем страницу с погодой
        showPage('home');
        
        // Отображаем данные
        displayCurrentWeather(currentWeatherData);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Error details:', error);
        alert('Ошибка при получении данных о погоде: ' + error.message);
    }
}

function displayCurrentWeather(data) {
    const weatherInfo = weatherContainer.querySelector('.weather-info');
    if (!weatherInfo) return;

    const temp = Math.round(data.main.temp);
    const description = data.weather[0].description;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const pressure = Math.round(data.main.pressure * 0.75006375541921);
    const cityName = data.name;

    // Проверяем, есть ли город уже в избранном
    const isFavorite = favorites[cityName];
    
    weatherInfo.innerHTML = `
        <div class="temperature">${temp}°C</div>
        <div class="description">${description}</div>
        <div class="details">
            <div>Влажность: ${humidity}%</div>
            <div>Ветер: ${windSpeed} м/с</div>
            <div>Давление: ${pressure} мм рт.ст.</div>
        </div>
        ${currentUser ? `
            <button onclick="addToFavorites('${cityName}')" class="favorite-btn" ${isFavorite ? 'disabled' : ''}>
                ${isFavorite ? 'Уже в избранном' : 'Добавить в избранное'}
            </button>
        ` : ''}
    `;
}

function displayForecast(data) {
    if (!forecastContainer) return;

    // Фильтруем прогноз, чтобы показывать только один прогноз в день
    const dailyForecasts = data.list.filter((item, index) => index % 8 === 0);
    
    forecastContainer.innerHTML = dailyForecasts.map(day => {
        const temp = Math.round(day.main.temp);
        const description = day.weather[0].description;
        const date = formatDate(day.dt * 1000);
        const icon = day.weather[0].icon;
        
        return `
            <div class="forecast-card">
                <div class="date">${date}</div>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" class="weather-icon">
                <div class="temp">${temp}°C</div>
                <div class="description">${description}</div>
            </div>
        `;
    }).join('');
}

// Функции работы с избранным
function loadFavorites() {
    if (!currentUser) return;
    
    const savedFavorites = localStorage.getItem(`favorites_${currentUser.email}`);
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
        displayFavorites();
    } else {
        favorites = {};
    }
}

function saveFavorites() {
    if (!currentUser) return;
    localStorage.setItem(`favorites_${currentUser.email}`, JSON.stringify(favorites));
}

function displayFavorites() {
    if (!favoritesContainer) return;
    
    // Clear the container first
    favoritesContainer.innerHTML = '';
    
    // For each favorite city, create a card with weather info
    Object.keys(favorites).forEach(async city => {
        try {
            // Get current weather
            const currentWeatherResponse = await fetch(
                `${OPENWEATHER_API_URL}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ru`
            );
            
            if (!currentWeatherResponse.ok) {
                throw new Error(`HTTP error! status: ${currentWeatherResponse.status}`);
            }
            
            const currentWeatherData = await currentWeatherResponse.json();
            
            // Get forecast
            const forecastResponse = await fetch(
                `${OPENWEATHER_API_URL}/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ru`
            );
            
            if (!forecastResponse.ok) {
                throw new Error(`HTTP error! status: ${forecastResponse.status}`);
            }
            
            const forecastData = await forecastResponse.json();
            
            // Create favorite card
            const favoriteCard = document.createElement('div');
            favoriteCard.className = 'favorite-card';
            
            // Filter forecast to show one per day
            const dailyForecasts = forecastData.list.filter((item, index) => index % 8 === 0);
            
            favoriteCard.innerHTML = `
            <h3>${city}</h3>
                <div class="current-weather">
                    <div class="temperature">${Math.round(currentWeatherData.main.temp)}°C</div>
                    <img src="https://openweathermap.org/img/wn/${currentWeatherData.weather[0].icon}@2x.png" alt="${currentWeatherData.weather[0].description}" class="weather-icon">
                    <div class="description">${currentWeatherData.weather[0].description}</div>
                    <div class="details">
                        <div>Влажность: ${currentWeatherData.main.humidity}%</div>
                        <div>Ветер: ${currentWeatherData.wind.speed} м/с</div>
                        <div>Давление: ${Math.round(currentWeatherData.main.pressure * 0.75006375541921)} мм рт.ст.</div>
                    </div>
                </div>
                <div class="forecast-list">
                    ${dailyForecasts.map(day => `
                        <div class="forecast-item">
                            <div class="date">${formatDate(day.dt * 1000)}</div>
                            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}" class="weather-icon">
                            <div class="temp">${Math.round(day.main.temp)}°C</div>
                            <div class="description">${day.weather[0].description}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="favorite-actions">
                    <button onclick="searchWeather('${city}')">Обновить</button>
            <button onclick="removeFromFavorites('${city}')">Удалить</button>
        </div>
            `;
            
            favoritesContainer.appendChild(favoriteCard);
        } catch (error) {
            console.error(`Error fetching weather for ${city}:`, error);
            // Create a card with error message
            const errorCard = document.createElement('div');
            errorCard.className = 'favorite-card error';
            errorCard.innerHTML = `
                <h3>${city}</h3>
                <div class="error-message">Ошибка загрузки данных о погоде</div>
                <div class="favorite-actions">
                    <button onclick="searchWeather('${city}')">Попробовать снова</button>
                    <button onclick="removeFromFavorites('${city}')">Удалить</button>
                </div>
            `;
            favoritesContainer.appendChild(errorCard);
        }
    });
}

function addToFavorites(city) {
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему, чтобы добавлять города в избранное');
        return;
    }
    
    if (!favorites[city]) {
        favorites[city] = true;
        saveFavorites();
        displayFavorites();
        
        // Обновляем кнопку в текущем погодном блоке
        const weatherInfo = weatherContainer.querySelector('.weather-info');
        if (weatherInfo) {
            const favoriteBtn = weatherInfo.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.textContent = 'Уже в избранном';
                favoriteBtn.disabled = true;
            }
        }
        
        alert(`Город ${city} добавлен в избранное`);
    }
}

function removeFromFavorites(city) {
    if (!currentUser) return;
    
    delete favorites[city];
    saveFavorites();
    displayFavorites();
}

// Функция форматирования даты
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// Geocoding functions
async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error(`Адрес не найден: ${address}`);
        }
        
        return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
            display_name: data[0].display_name
        };
    } catch (error) {
        throw new Error(`Ошибка при поиске адреса: ${error.message}`);
    }
}

// Helper function to check if string looks like coordinates
function looksLikeCoordinates(str) {
    // Match patterns like "55.7558, 37.6173" or "55.7558,37.6173"
    return /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(str);
}

// Setup route controls
function setupRouteControls() {
    if (findRouteBtn) {
        findRouteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!routeFrom || !routeTo) return;
            
            if (!routeFrom.value || !routeTo.value) {
                alert("Пожалуйста, введите начальную и конечную точки маршрута");
                return;
            }
            
            try {
                let fromCoords, toCoords;
                let fromAddress, toAddress;

                // Process "From" location
                if (looksLikeCoordinates(routeFrom.value)) {
                    fromCoords = parseCoordinates(routeFrom.value);
                    fromAddress = `${routeFrom.value}`;
                } else {
                    const fromGeocode = await geocodeAddress(routeFrom.value);
                    fromCoords = ol.proj.fromLonLat([fromGeocode.lon, fromGeocode.lat]);
                    fromAddress = fromGeocode.display_name;
                    routeFrom.value = fromAddress;
                }

                // Process "To" location
                if (looksLikeCoordinates(routeTo.value)) {
                    toCoords = parseCoordinates(routeTo.value);
                    toAddress = `${routeTo.value}`;
                } else {
                    const toGeocode = await geocodeAddress(routeTo.value);
                    toCoords = ol.proj.fromLonLat([toGeocode.lon, toGeocode.lat]);
                    toAddress = toGeocode.display_name;
                    routeTo.value = toAddress;
                }

                buildRoute(fromCoords, toCoords, fromAddress, toAddress);
            } catch (error) {
                alert(error.message);
            }
        });
    }
    
    if (useGPSBtn) {
        useGPSBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!routeFrom) return;
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async position => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        try {
                            // Try to get address for the coordinates
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                            const data = await response.json();
                            
                            if (data && data.display_name) {
                                routeFrom.value = data.display_name;
                            } else {
                                routeFrom.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                            }
                        } catch (error) {
                            // Fallback to coordinates if address lookup fails
                            routeFrom.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                        }
                    },
                    error => {
                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                alert("Вы запретили доступ к геолокации");
                                break;
                            case error.POSITION_UNAVAILABLE:
                                alert("Информация о местоположении недоступна");
                                break;
                            case error.TIMEOUT:
                                alert("Превышено время ожидания определения местоположения");
                                break;
                            default:
                                alert("Ошибка при получении GPS координат: " + error.message);
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    }
                );
            } else {
                alert("Ваш браузер не поддерживает геолокацию");
            }
        });
    }
}

// Get route between two points using OSRM
async function getRoute(fromLonLat, toLonLat) {
    try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromLonLat[0]},${fromLonLat[1]};${toLonLat[0]},${toLonLat[1]}?overview=full&geometries=geojson`);
        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error('Не удалось построить маршрут');
        }

        return {
            geometry: data.routes[0].geometry,
            distance: data.routes[0].distance / 1000, // Convert to kilometers
            duration: Math.round(data.routes[0].duration / 60) // Convert to minutes
        };
    } catch (error) {
        throw new Error(`Ошибка при построении маршрута: ${error.message}`);
    }
}

// Update buildRoute to use road routing
async function buildRoute(from, to, fromAddress, toAddress) {
    try {
        // Remove existing route
        clearRoute();

        // Convert coordinates back to lon/lat for OSRM
        const fromLonLat = ol.proj.toLonLat(from);
        const toLonLat = ol.proj.toLonLat(to);

        // Get route from OSRM
        const routeData = await getRoute(fromLonLat, toLonLat);

        // Create route feature with the actual road geometry
        const routeFeature = new ol.Feature({
            geometry: new ol.geom.LineString(routeData.geometry.coordinates.map(coord => 
                ol.proj.fromLonLat(coord)
            ))
        });

        // Style for the route
        routeFeature.setStyle(new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#4CAF50',
                width: 4
            })
        }));

        // Add route to layer
        routeLayer.getSource().addFeature(routeFeature);

        // Create markers
        const startMarker = new ol.Feature({
            geometry: new ol.geom.Point(from)
        });

        const endMarker = new ol.Feature({
            geometry: new ol.geom.Point(to)
        });

        // Style markers
        startMarker.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({
                    color: '#4CAF50'
                }),
                stroke: new ol.style.Stroke({
                    color: '#fff',
                    width: 2
                })
            })
        }));

        endMarker.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({
                    color: '#F44336'
                }),
                stroke: new ol.style.Stroke({
                    color: '#fff',
                    width: 2
                })
            })
        }));

        // Add markers to route layer
        routeLayer.getSource().addFeatures([startMarker, endMarker]);

        // Update route info with addresses and actual route data
        updateRouteInfo(fromAddress, toAddress, routeData.distance, routeData.duration);

        // Fit view to show the entire route
        const extent = routeLayer.getSource().getExtent();
        map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000
        });
    } catch (error) {
        alert(error.message);
    }
}

// Update route info display
function updateRouteInfo(fromAddress, toAddress, distance, duration) {
    if (routeInfoElement) {
        // Сохраняем текущее состояние (свернуто/развернуто)
        const wasCollapsed = routeInfoElement.classList.contains('collapsed');
        
        routeInfoElement.innerHTML = `
            <div><strong>Откуда:</strong> ${fromAddress}</div>
            <div><strong>Куда:</strong> ${toAddress}</div>
            <div><strong>Расстояние:</strong> ${distance.toFixed(1)} км</div>
            <div><strong>Время:</strong> ${duration} мин</div>
        `;
        
        // Добавляем обработчик клика для сворачивания/разворачивания
        if (!routeInfoElement.hasClickHandler) {
            routeInfoElement.addEventListener('click', () => {
                routeInfoElement.classList.toggle('collapsed');
                routeInfoElement.classList.toggle('expanded');
            });
            routeInfoElement.hasClickHandler = true;
        }
        
        // По умолчанию показываем только первую строку
        if (!wasCollapsed) {
            routeInfoElement.classList.add('collapsed');
        }
        routeInfoElement.classList.add('expanded');
    }
}

function clearRoute() {
    if (routeLayer) {
        routeLayer.getSource().clear();
    }
    
    if (routeInfoElement) {
        routeInfoElement.innerHTML = '';
        routeInfoElement.classList.remove('collapsed', 'expanded');
    }
}

// Helper function to parse coordinates from string
function parseCoordinates(coordsString) {
    // Remove any extra whitespace
    coordsString = coordsString.trim();
    
    // Try to match coordinates in format "55.7558, 37.6173" or "55.7558,37.6173"
    const parts = coordsString.split(/\s*,\s*/);
    
    if (parts.length !== 2) {
        throw new Error("Координаты должны быть в формате: 55.7558, 37.6173");
    }
    
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    
    if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Координаты должны быть числами. Пример: 55.7558, 37.6173");
    }
    
    if (lat < -90 || lat > 90) {
        throw new Error("Широта должна быть от -90 до 90 градусов");
    }
    
    if (lon < -180 || lon > 180) {
        throw new Error("Долгота должна быть от -180 до 180 градусов");
    }
    
    // Convert coordinates to map coordinates
    return ol.proj.fromLonLat([lon, lat]);
}

// Функция настройки поиска городов
function setupCitySearch() {
    if (!citySearchMap || !searchCityBtn || !searchResults) return;

    // Обработчик ввода в поле поиска
    citySearchMap.addEventListener('input', () => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Добавляем задержку для предотвращения частых запросов
        searchTimeout = setTimeout(() => {
            const query = citySearchMap.value.trim();
            if (query.length >= 3) {
                searchCity(query);
            } else {
                searchResults.innerHTML = '';
                searchResults.classList.remove('active');
            }
        }, 300);
    });

    // Обработчик кнопки поиска
    searchCityBtn.addEventListener('click', () => {
        const query = citySearchMap.value.trim();
        if (query.length >= 3) {
            searchCity(query);
        }
    });

    // Закрытие результатов при клике вне
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.city-search')) {
            searchResults.classList.remove('active');
        }
    });
}

// Функция поиска города
async function searchCity(query) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            displaySearchResults(data);
        } else {
            searchResults.innerHTML = '<div class="search-result-item">Ничего не найдено</div>';
            searchResults.classList.add('active');
        }
    } catch (error) {
        console.error('Error searching city:', error);
        searchResults.innerHTML = '<div class="search-result-item">Ошибка поиска</div>';
        searchResults.classList.add('active');
    }
}

// Функция отображения результатов поиска
function displaySearchResults(results) {
    searchResults.innerHTML = results.map(result => `
        <div class="search-result-item" data-lat="${result.lat}" data-lon="${result.lon}">
            <div class="name">${result.display_name.split(',')[0]}</div>
            <div class="details">${result.display_name}</div>
        </div>
    `).join('');
    
    searchResults.classList.add('active');
    
    // Добавляем обработчики клика на результаты
    const items = searchResults.querySelectorAll('.search-result-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);
            
            // Перемещаем карту к выбранному городу
            const coords = ol.proj.fromLonLat([lon, lat]);
            map.getView().animate({
                center: coords,
                zoom: 12,
                duration: 1000
            });
            
            // Обновляем поле поиска и скрываем результаты
            citySearchMap.value = item.querySelector('.name').textContent;
            searchResults.classList.remove('active');
            
            // Запрашиваем погоду для выбранного города
            searchWeather(citySearchMap.value);
        });
    });
}

// Обновляем обработчик клавиш для поля поиска
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement === citySearchMap) {
            const query = citySearchMap.value.trim();
            if (query.length >= 3) {
                searchCity(query);
            }
        }
    }
});