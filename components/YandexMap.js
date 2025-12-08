import { useEffect, useState, useRef } from 'react'
import { YMaps, Map, Circle } from '@pbe/react-yandex-maps'

export default function YandexMap({ circles }) {
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || ''
  const [customization, setCustomization] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    // Загружаем кастомизацию карты
    fetch('/map-customization.json')
      .then(res => res.json())
      .then(data => {
        setCustomization(data)
        console.log('Map customization loaded:', data)
      })
      .catch(err => {
        console.warn('Failed to load map customization:', err)
        setCustomization(null)
      })
  }, [])

  // Применяем кастомизацию через API Яндекс.Карт после загрузки
  useEffect(() => {
    if (customization && mapRef.current) {
      const applyCustomization = () => {
        try {
          const mapInstance = mapRef.current
          if (mapInstance && typeof mapInstance.options === 'object' && mapInstance.options.set) {
            // Применяем кастомизацию через API
            mapInstance.options.set('customization', customization)
            console.log('Customization applied to map via API')
            return true
          }
        } catch (error) {
          console.error('Failed to apply customization:', error)
        }
        return false
      }

      // Пробуем применить через window.ymaps.ready
      if (window.ymaps && typeof window.ymaps.ready === 'function') {
        window.ymaps.ready(() => {
          setTimeout(() => {
            applyCustomization()
          }, 100)
        })
      } else {
        // Если ymaps еще не загружен, ждем
        const checkInterval = setInterval(() => {
          if (window.ymaps && typeof window.ymaps.ready === 'function') {
            clearInterval(checkInterval)
            window.ymaps.ready(() => {
              setTimeout(() => {
                applyCustomization()
              }, 100)
            })
          }
        }, 100)

        // Очищаем интервал через 10 секунд
        setTimeout(() => clearInterval(checkInterval), 10000)
      }

      // Также пробуем применить напрямую
      setTimeout(applyCustomization, 500)
      setTimeout(applyCustomization, 1000)
      setTimeout(applyCustomization, 2000)
    }
  }, [customization, mapRef.current])

  if (!apiKey) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '18px',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        <div>
          <p>API ключ Яндекс.Карт не установлен. Добавьте NEXT_PUBLIC_YANDEX_MAPS_API_KEY в .env</p>
        </div>
      </div>
    )
  }

  // Конвертируем circles в формат для карты
  const mapCircles = circles.map((circle) => {
        const moscow = [55.7558, 37.6173]
        const piter = [59.9343, 30.3351]
        const city = circle.baseX === 500 ? moscow : piter
        
        // Конвертируем смещения из пикселей в градусы
    const latOffset = (circle.offsetY / 200) * 0.5
        const lngOffset = (circle.offsetX / 200) * 0.5 / Math.cos(city[0] * Math.PI / 180)
        
        const lat = city[0] + latOffset
        const lng = city[1] + lngOffset
        
    // Конвертируем размер в метры
    const radiusMeters = circle.size * 150
    
    return {
      id: circle.id,
      center: [lat, lng],
      radius: radiusMeters
    }
  })

  return (
    <YMaps query={{ apikey: apiKey, lang: 'ru_RU' }}>
      <Map
        instanceRef={mapRef}
        defaultState={{
        center: [55.7558, 37.6173], // Центр между Москвой и Питером
        zoom: 6,
        }}
        width="100%"
        height="100%"
        onLoad={(ymaps) => {
          console.log('Map loaded, applying customization via API')
          if (customization && mapRef.current) {
            // Используем window.ymaps для применения кастомизации
            if (window.ymaps && typeof window.ymaps.ready === 'function') {
              window.ymaps.ready(() => {
                setTimeout(() => {
                  try {
                    if (mapRef.current && mapRef.current.options && typeof mapRef.current.options.set === 'function') {
                      mapRef.current.options.set('customization', customization)
                      console.log('Customization applied on map load via ymaps.ready')
                    }
                  } catch (error) {
                    console.error('Failed to apply customization on load:', error)
                  }
                }, 200)
              })
            } else {
              // Если ymaps еще не готов, пробуем позже
              setTimeout(() => {
                if (mapRef.current && mapRef.current.options && typeof mapRef.current.options.set === 'function') {
                  try {
                    mapRef.current.options.set('customization', customization)
                    console.log('Customization applied on map load (delayed)')
                  } catch (error) {
                    console.error('Failed to apply customization on load (delayed):', error)
                  }
                }
              }, 1000)
            }
          }
        }}
        options={{
          suppressMapOpenBlock: true,
          ...(customization && { customization: customization })
        }}
      >
        {mapCircles.map((circle) => (
          <Circle
            key={circle.id}
            geometry={[circle.center, circle.radius]}
            options={{
              fillColor: '#ffffff',
              fillOpacity: 1,
              strokeColor: '#000000',
              strokeWidth: 2,
            }}
          />
        ))}
      </Map>
    </YMaps>
  )
}
