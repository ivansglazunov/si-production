import { useEffect, useRef } from 'react'

export default function YandexMap({ circles }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const placemarksRef = useRef([])
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || ''
    
    if (!apiKey) {
      console.error('Yandex Maps API key is not set. Please add NEXT_PUBLIC_YANDEX_MAPS_API_KEY to .env.local')
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const loadMap = () => {
      if (mapRef.current && !mapInstanceRef.current) {
        initMap()
      } else {
        setTimeout(() => {
          if (mapRef.current && !mapInstanceRef.current) {
            initMap()
          }
        }, 100)
      }
    }

    const checkYmaps = () => {
      if (window.ymaps && typeof window.ymaps.ready === 'function') {
        window.ymaps.ready(() => {
          loadMap()
        })
        return true
      }
      return false
    }

    // Если API уже загружен
    if (checkYmaps()) {
      return () => {
        cleanup()
      }
    }

    // Загружаем скрипт напрямую, если Next.js Script не сработал
    if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true
      
      // Проверяем, не загружен ли скрипт уже
      const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          if (checkYmaps()) {
            return
          }
        })
        if (checkYmaps()) {
          return () => {
            cleanup()
          }
        }
      }

      // Загружаем скрипт напрямую
      const script = document.createElement('script')
      script.src = `https://api-maps.yandex.ru/3.0/?apikey=${apiKey}&lang=ru_RU`
      script.async = true
      script.type = 'text/javascript'
      
      script.onload = () => {
        console.log('Yandex Maps script loaded directly')
        setTimeout(() => {
          if (checkYmaps()) {
            return
          }
        }, 100)
      }
      
      script.onerror = (error) => {
        console.error('Failed to load Yandex Maps script directly:', error)
        console.error('API Key:', apiKey.substring(0, 8) + '...')
        console.error('Please check:')
        console.error('1. Is the API key valid?')
        console.error('2. Is Maps API enabled for this key?')
        console.error('3. Is the referrer configured correctly?')
        scriptLoadedRef.current = false
      }
      
      document.head.appendChild(script)
    }

    // Ждем загрузки скрипта
    let attempts = 0
    const maxAttempts = 100
    
    const waitForYmaps = setInterval(() => {
      attempts++
      
      if (checkYmaps()) {
        clearInterval(waitForYmaps)
      } else if (attempts >= maxAttempts) {
        console.error('Yandex Maps API failed to load after 10 seconds')
        clearInterval(waitForYmaps)
      }
    }, 100)

    const cleanup = () => {
      clearInterval(waitForYmaps)
      // Очищаем метки
      if (mapInstanceRef.current && placemarksRef.current.length > 0) {
        placemarksRef.current.forEach(placemark => {
          mapInstanceRef.current.geoObjects.remove(placemark)
        })
        placemarksRef.current = []
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }

    return cleanup
  }, [])

  useEffect(() => {
    // Обновляем кружочки при изменении circles
    if (mapInstanceRef.current && circles.length > 0) {
      // Удаляем старые метки
      placemarksRef.current.forEach(placemark => {
        mapInstanceRef.current.geoObjects.remove(placemark)
      })
      placemarksRef.current = []

      // Добавляем новые кружочки
      circles.forEach((circle) => {
        const moscow = [55.7558, 37.6173]
        const piter = [59.9343, 30.3351]
        const city = circle.baseX === 500 ? moscow : piter
        
        // Конвертируем смещения из пикселей в градусы
        // Примерно: 1 градус широты = 111 км, смещение 200px на экране ≈ 0.5-1 градус
        const latOffset = (circle.offsetY / 200) * 0.5 // примерно 0.5 градуса на 200px
        const lngOffset = (circle.offsetX / 200) * 0.5 / Math.cos(city[0] * Math.PI / 180)
        
        const lat = city[0] + latOffset
        const lng = city[1] + lngOffset
        
        // Создаем кружочек через Circle (радиус в метрах)
        // Размер кружочка от 10px до 300px, конвертируем в метры для карты
        // При zoom 6, 1px ≈ 100-200 метров
        const radiusMeters = circle.size * 150 // примерная конвертация
        
        const circleGeo = new window.ymaps.Circle(
          [[lat, lng], radiusMeters],
          {},
          {
            fillColor: '#ffffff',
            fillOpacity: 1,
            strokeColor: '#000000',
            strokeWidth: 2
          }
        )
        
        mapInstanceRef.current.geoObjects.add(circleGeo)
        placemarksRef.current.push(circleGeo)
      })
    }
  }, [circles])

  const initMap = async () => {
    // Проверяем, что ref существует и карта еще не создана
    if (!mapRef.current) {
      console.warn('Map ref is not available yet')
      return
    }

    if (mapInstanceRef.current) {
      console.log('Map already initialized')
      return
    }

    if (!window.ymaps) {
      console.error('Yandex Maps API is not loaded')
      return
    }

    try {
      console.log('Initializing map...')
      
      // Загружаем тему из файла
      let customization = null
      try {
        const response = await fetch('/map-customization.json')
        if (response.ok) {
          customization = await response.json()
          console.log('Customization loaded successfully')
        }
      } catch (error) {
        console.warn('Failed to load customization, using default theme:', error)
      }

      // Создаем карту
      const mapOptions = {
        center: [55.7558, 37.6173], // Центр между Москвой и Питером
        zoom: 6,
        controls: []
      }

      const map = customization
        ? new window.ymaps.Map(mapRef.current, mapOptions, {
            customization: customization
          })
        : new window.ymaps.Map(mapRef.current, mapOptions)

      mapInstanceRef.current = map
      console.log('Map initialized successfully', map)
    } catch (error) {
      console.error('Error initializing map:', error)
    }
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%'
      }}
    />
  )
}

