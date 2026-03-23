import React, { useRef, useState, useEffect, Suspense, memo, useMemo, useCallback } from 'react'
import { motion, useScroll, useMotionValueEvent, useSpring, useTransform, useMotionValue, useMotionTemplate, useMotionValueEvent as useMotionValueEvent2 } from 'framer-motion'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadialBarChart, RadialBar } from 'recharts'
import { useParallaxStore } from '../store/parallaxStore'
import Papa from 'papaparse'
import Image from 'next/image'
// Встроенные изображения для лент - загружаются синхронно при импорте модуля
// Все данные встроены в JS код, никаких запросов к серверу
import { lentaImages } from '../data/lenta_images'

// Компонент пункта договора с галочкой
const ContractItem = memo(function ContractItem({ text, progress, threshold, textColor }) {
  // progress может быть motion value или числом
  const [progressValue, setProgressValue] = useState(typeof progress === 'number' ? progress : 0)
  
  // Если progress - motion value, подписываемся на изменения
  useEffect(() => {
    if (typeof progress === 'object' && 'on' in progress) {
      const unsubscribe = progress.on('change', (latest) => {
        setProgressValue(latest * 100)
      })
      return unsubscribe
    } else if (typeof progress === 'number') {
      setProgressValue(progress)
    }
  }, [progress])
  
  // Галочка ставится когда progress >= threshold
  const isChecked = progressValue >= threshold

  return (
    <div style={{
          display: 'flex',
          alignItems: 'center',
      gap: '0.8em',
      fontSize: '0.7em',
      fontFamily: 'Helvetica, Arial, sans-serif',
      marginBottom: '0.8em'
    }}>
      <div style={{
          width: '1.2em',
          height: '1.2em',
          minWidth: '1.2em',
          minHeight: '1.2em',
          border: '0.1em solid #ff0000',
          borderRadius: '0.2em',
          flexShrink: 0,
          backgroundColor: isChecked ? '#ff0000' : 'transparent',
            display: 'flex',
            alignItems: 'center',
          justifyContent: 'center',
            position: 'relative',
          transition: 'background-color 0.3s ease'
        }}>
        {isChecked && (
          <svg
            width="0.8em"
            height="0.8em"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M3 8L6 11L13 4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        </div>
      {textColor ? (
        <motion.span style={{ color: textColor, fontWeight: 'bold' }}>{text}</motion.span>
      ) : (
        <span style={{ color: '#000000', fontWeight: 'bold' }}>{text}</span>
      )}
    </div>
  )
})

// Компонент Вспышка
function Flash({ isActive, onComplete }) {
  if (!isActive) return null

  // Несколько вспышек для калибровки (как на современных телефонах)
  // Финальная вспышка длится столько же, сколько хлопушка на экране (~2.6 сек)
  // Хлопушка появляется на 1/3 времени всех вспышек раньше (~1 сек)
  const totalDuration = 4.5 // Общая длительность: 0.5 сек калибровка + 2.6 сек финальная вспышка + 1.4 сек затухание
  const clapperboardShowTime = 1.0 // Хлопушка появляется на 1 сек (на 1/3 времени всех вспышек раньше)
  const finalFlashStart = 0.22 // Финальная вспышка начинается на 0.22 (~1 сек) - синхронизировано с хлопушкой
  const finalFlashPeak = 0.25 // Максимум финальной вспышки на 0.25 (~1.125 сек)
  const finalFlashEnd = 0.78 // Финальная вспышка заканчивается на 0.78 (~3.51 сек) - примерно когда хлопушка скрывается
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: [
          0, 1, 0,      // Первая вспышка (быстрая)
          0, 0.8, 0,    // Вторая вспышка (средняя)
          0, 0.6, 0,    // Третья вспышка (слабая)
          0, 1, 1, 0    // Финальная длинная вспышка (длится столько же, сколько хлопушка на экране)
        ]
      }}
      transition={{ 
        duration: totalDuration,
        times: [
          0, 0.05, 0.1,           // Первая вспышка (0-0.45 сек)
          0.12, 0.15, 0.18,       // Вторая вспышка (0.54-0.81 сек)
          finalFlashStart, finalFlashPeak, finalFlashEnd, 1  // Финальная вспышка начинается раньше (~1 сек) и длится до ~3.51 сек
        ],
        onComplete: onComplete
      }}
        style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
          width: '100vw', 
          height: 'calc(var(--vh, 1vh) * 100)', 
        backgroundColor: '#ffffff',
        zIndex: 100000,
        pointerEvents: 'none'
      }}
    />
  )
}

// Компонент Хлопушка-Нумератор (Clapperboard)
const Clapperboard = memo(({ isActive, isVisible, onClose }) => {
  const clapperboardWidth = 600 // px
  const topHeight = 30 // px - верхняя половинка
  const bottomHeight = 400 // px - нижний див
  const stripeHeight = 30 // px - полоса с косыми чертами внутри нижнего дива
  
  const containerRef = useRef(null)
  const mouseX = useMotionValue(0) // Позиция мыши относительно центра (от -1 до 1)
  const mouseY = useMotionValue(0)
  
  // Отслеживаем позицию мыши относительно счелкунчика
  useEffect(() => {
    if (!isVisible || !containerRef.current) return
    
    const handleMouseMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // Вычисляем относительную позицию мыши от центра (-1 до 1)
      const relativeX = (e.clientX - centerX) / (rect.width / 2)
      const relativeY = (e.clientY - centerY) / (rect.height / 2)
      
      mouseX.set(relativeX)
      mouseY.set(relativeY)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isVisible, mouseX, mouseY])
  
  // Вычисляем смещение света (в противоположном направлении от мышки)
  // Центр элемента находится на 50% top/left, поэтому нужно вычесть половину размера (300px)
  const lightOffsetX = useTransform(mouseX, (x) => -x * 50 - 300) // Максимальное смещение 50px + центрирование
  const lightOffsetY = useTransform(mouseY, (y) => -y * 50 - 300)
  
  // Вычисляем 3D поворот на основе позиции мыши (в 4 раза слабее)
  const rotateXValue = useTransform(mouseY, (y) => -y * 3.75) // Поворот по X (наклон вперед/назад) до 3.75 градусов
  const rotateYValue = useTransform(mouseX, (x) => x * 3.75) // Поворот по Y (наклон влево/вправо) до 3.75 градусов
  
  // Используем useMotionTemplate для создания transform строки из motion values
  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateXValue}deg) rotateY(${rotateYValue}deg)`
  
  // Не рендерим компонент, если он не виден
  if (!isVisible) {
    return null
  }

  return (
    <motion.div
      className="clapperboard-container"
      initial={false}
      animate={{
        y: ['calc(var(--vh, 1vh) * -100)', 0, -30, 0, -15, 0, -8, 0], // Падение сверху с отскоками
        opacity: 1,
        scale: 1
      }}
      transition={{
        y: {
          duration: 1.5,
          times: [0, 0.4, 0.5, 0.65, 0.75, 0.85, 0.92, 1],
          ease: [0.25, 0.46, 0.45, 0.94], // Ease out для падения
          type: 'tween' // Явно указываем тип для keyframes анимации
        },
        opacity: {
          duration: 0.3,
          type: 'tween'
        },
        scale: {
          duration: 0.3,
          type: 'tween'
        }
      }}
      ref={containerRef}
      style={{
        position: 'relative',
        width: `${clapperboardWidth}px`,
        height: `${topHeight + bottomHeight}px`,
        pointerEvents: 'auto',
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transform: transform,
        transition: 'transform 0.1s ease-out'
      }}
      onClick={onClose}
    >
      {/* Верхний див - верхняя половинка киносчелкунчика w600 h30 с косыми чертами */}
      <motion.div
        className="clapperboard-top"
        initial={{ rotate: 90 }} // Начальное состояние - повернут на 90 градусов (открыт)
        animate={{ 
          rotate: isActive ? 90 : 0 // При появлении (isActive=true) открыт (90°), потом закрывается (0°)
        }}
        transition={{ 
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        style={{
          width: `${clapperboardWidth}px`,
          height: `${topHeight}px`,
          background: `repeating-linear-gradient(
            -45deg,
            #000000 0px,
            #000000 10px,
            #ffffff 10px,
            #ffffff 20px
          )`,
          transformOrigin: 'bottom right', // Точка крепления - правый нижний угол
          zIndex: 2,
          overflow: 'hidden',
          boxShadow: isActive ? '0 4px 8px rgba(0, 0, 0, 0.3)' : 'none'
        }}
      />

      {/* Нижний див - w600 h400px черный с закругленными на 60px нижними углами */}
      <div
        style={{
          width: `${clapperboardWidth}px`,
          height: `${bottomHeight}px`,
          backgroundColor: '#000000', // Чисто черный
          borderBottomLeftRadius: '60px',
          borderBottomRightRadius: '60px',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Внутри нижнего дива сверху прямоугольный див с косыми чертами w600 h30 */}
        <div
          style={{
            width: `${clapperboardWidth}px`,
            height: `${stripeHeight}px`,
            background: `repeating-linear-gradient(
              45deg,
              #000000 0px,
              #000000 10px,
              #ffffff 10px,
              #ffffff 20px
            )`,
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
        
        {/* Градиентное круговое свечение темно-серым в центре нижнего дива */}
        {isVisible && (
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '600px', // Втрое больше (было 200px)
              height: '600px',
              background: 'radial-gradient(circle, rgba(42, 42, 42, 0.4) 0%, rgba(42, 42, 42, 0.2) 40%, transparent 70%)', // Вдвое менее яркий (было 0.8 и 0.4)
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 2,
              x: lightOffsetX,
              y: lightOffsetY
            }}
          />
        )}

        {/* Линейная сетка: 2 колонки и 4 строки через CSS Grid */}
        <div
          style={{
            position: 'absolute',
            top: `${stripeHeight}px`,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'repeat(4, 1fr)',
            zIndex: 3,
            pointerEvents: 'none'
          }}
        >
          {/* Строка 1, Колонка 1: PHONE */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            padding: '12px',
            borderRight: '2px solid #888888',
            borderBottom: '2px solid #888888',
            color: '#ffffff',
            fontFamily: "'Science Gothic', monospace",
            fontSize: '26px'
          }}>
            <div style={{ opacity: 0.8, fontSize: '22px', marginBottom: '4px' }}>PHONE</div>
          </div>

          {/* Строка 1, Колонка 2: +7 (925) 846-50-52 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '12px',
            borderBottom: '2px solid #888888',
            color: '#ffffff',
            fontFamily: "'Slovic', cursive",
            fontSize: '26px'
          }}>
            +7 (925) 846-50-52
          </div>

          {/* Строка 2, Колонка 1: пусто */}
          <div style={{ 
            borderRight: '2px solid #888888',
            borderBottom: '2px solid #888888'
          }} />

          {/* Строка 2, Колонка 2: +7 (977) 747-33-77 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '12px',
            borderBottom: '2px solid #888888',
            color: '#ffffff',
            fontFamily: "'Slovic', cursive",
            fontSize: '26px'
          }}>
            +7 (977) 747-33-77
          </div>

          {/* Строка 3, Колонка 1: TELEGRAM */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            padding: '12px',
            borderRight: '2px solid #888888',
            borderBottom: '2px solid #888888',
            color: '#ffffff',
            fontFamily: "'Science Gothic', monospace",
            fontSize: '26px'
          }}>
            <div style={{ opacity: 0.8, fontSize: '22px', marginBottom: '4px' }}>TELEGRAM</div>
          </div>

          {/* Строка 3, Колонка 2: @si_production_bot */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderBottom: '2px solid #888888',
            color: '#ffffff',
            fontFamily: "'Slovic', cursive",
            fontSize: '26px',
            position: 'relative'
          }}>
            <a
              href="https://t.me/si_production_bot"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                color: '#ffffff',
                textDecoration: 'none',
                pointerEvents: 'auto',
                transition: 'opacity 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.8'
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1'
              }}
            >
              @si_production_bot
              {/* Красный незамкнутый круг-маркер */}
              <svg style={{ position: 'absolute', top: '-12px', left: '-16px', width: 'calc(100% + 32px)', height: 'calc(100% + 24px)', pointerEvents: 'none', overflow: 'visible' }} viewBox="0 0 200 60" preserveAspectRatio="none">
                <ellipse cx="100" cy="30" rx="95" ry="26" fill="none" stroke="#ff2222" strokeWidth="3" strokeLinecap="round" strokeDasharray="520" strokeDashoffset="80" style={{ filter: 'url(#marker-roughness)' }} />
                <defs>
                  <filter id="marker-roughness">
                    <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                </defs>
              </svg>
            </a>
          </div>

          {/* Строка 4, Колонка 1-2: ИП Щербаков М.А. (объединенная ячейка) */}
          <div style={{ 
            gridColumn: '1 / -1',
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            color: '#ffffff',
            fontFamily: "'Science Gothic', monospace",
            fontSize: '22px',
            fontStyle: 'italic',
            opacity: 0.7
          }}>
            ИП Щербаков М.А.
          </div>
        </div>
      </div>
    </motion.div>
  )
})

// Компонент для lazy loading кадров в лентах
const LazyFrame = memo(({ frame, index, frameWidth, frameHeight, borderWidth, isVisible, onError }) => {
  const frameRef = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  
  useEffect(() => {
    if (!frameRef.current || shouldLoad) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px' // Начинаем загрузку за 50px до появления в viewport
      }
    )
    
    observer.observe(frameRef.current)
    
    return () => {
      observer.disconnect()
    }
  }, [shouldLoad])
  
  // Если кадр уже видим или должен загружаться, показываем изображение
  const loadImage = isVisible || shouldLoad
  
  return (
    <div
      ref={frameRef}
      style={{
        width: `${frameWidth}px`,
        height: `${frameHeight + borderWidth * 2}px`,
        flexShrink: 0,
        position: 'relative',
        backgroundColor: '#000000',
      }}
    >
      {frame.type === 'image' ? (
        loadImage ? (
          <Image
            src={frame.src}
            alt={`Frame ${index}`}
            width={frameWidth}
            height={frameHeight}
            style={{
              position: 'absolute',
              top: `${borderWidth}px`,
              left: 0,
              width: '100%',
              height: `${frameHeight}px`,
              objectFit: 'cover',
              borderRadius: '2px'
            }}
            loading="lazy"
            onError={onError}
            unoptimized={false} // Используем оптимизацию Next.js
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: `${borderWidth}px`,
              left: 0,
              width: '100%',
              height: `${frameHeight}px`,
              backgroundColor: '#333',
              borderRadius: '2px'
            }}
          />
        )
      ) : (
        <div
          style={{
            position: 'absolute',
            top: `${borderWidth}px`,
            left: 0,
            width: '100%',
            height: `${frameHeight}px`,
            backgroundColor: frame.value || '#333',
            borderRadius: '2px'
          }}
        />
      )}
    </div>
  )
})

LazyFrame.displayName = 'LazyFrame'

// Славянские названия городов для галерей
const CITY_NAMES = [
  'Светлоград',
  'Звенигород', 
  'Переславль',
  'Беловодье',
  'Гориславль',
  'Ярославль',
  'Велиград',
  'Славутич',
  'Микулин',
  'Радогощ',
  'Любеч',
  'Киянь'
]

// Компонент нижней ленты фотографий (по 1 фото из каждой галереи) в стиле киноленты
function BottomPhotoStrip({ allLentas, embeddedImages, onPhotoClick, firstScreenProgress }) {
  const [firstPhotos, setFirstPhotos] = useState([])
  
  useEffect(() => {
    const photos = allLentas.map((lenta, index) => {
      const folderId = lenta.folderId
      // Используем встроенный base64 если есть — мгновенная загрузка
      const embedded = embeddedImages?.[folderId]?.[0]
      return {
        lentaId: lenta.id,
        folderId,
        cityName: CITY_NAMES[index] || `Альбом ${index + 1}`,
        src: embedded ? embedded.data : `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/1_thumb.webp`,
        index: 0
      }
    })
    setFirstPhotos(photos)
  }, [allLentas, embeddedImages])

  const frameWidth = 200
  const frameHeight = 120
  const borderWidth = 20
  const holeWidth = 12
  const holeHeight = 8
  const holeSpacing = 20
  const innerPadding = 8
  const innerBorderRadius = 12

  const translateX = useTransform(firstScreenProgress, [0, 1], ['150vw', '-150vw'])
  const translateY = useTransform(firstScreenProgress, [0, 1], [0, 160])

  return (
    <motion.div style={{
      position: 'absolute',
      bottom: '15em',
      left: '-10vw',
      width: '120vw',
      height: `${frameHeight + borderWidth * 2 + 40}px`,
      overflow: 'hidden',
      pointerEvents: 'auto',
      zIndex: 100,
      rotate: -15,
      transformOrigin: 'center center',
      y: translateY
    }}>
      <motion.div
        style={{
          display: 'flex',
          gap: 0,
          alignItems: 'stretch',
          height: '100%',
          paddingLeft: '40px',
          paddingRight: '40px',
          x: translateX
        }}
      >
        {firstPhotos.map((photo, index) => (
          <div
            key={photo.lentaId}
            onClick={() => onPhotoClick(photo.lentaId, 0, photo.folderId)}
            style={{
              flexShrink: 0,
              width: `${frameWidth}px`,
              height: `${frameHeight + borderWidth * 2}px`,
              backgroundColor: '#0d0d0d',
              cursor: 'pointer',
              position: 'relative',
              transition: 'transform 0.2s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
              borderLeft: '1px solid #1a1a1a',
              borderRight: '1px solid #1a1a1a'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <div style={{
              width: '100%',
              height: `${borderWidth}px`,
              backgroundColor: '#0a0a0a',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '0 6px'
            }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  style={{
                    width: `${holeWidth}px`,
                    height: `${holeHeight}px`,
                    backgroundColor: '#222',
                    borderRadius: '2px',
                    marginRight: `${holeSpacing - holeWidth}px`,
                    flexShrink: 0
                  }}
                />
              ))}
            </div>
            
            <div style={{
              width: '100%',
              height: `${frameHeight}px`,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0d0d0d'
            }}>
              <div style={{
                width: `calc(100% - ${innerPadding * 2}px)`,
                height: `calc(100% - ${innerPadding * 2}px)`,
                borderRadius: `${innerBorderRadius}px`,
                overflow: 'hidden',
                position: 'relative',
                border: '4px solid #1a1a1a',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                backgroundColor: '#111'
              }}>
                {photo.src ? (
                  <Image
                    src={photo.src}
                    alt={photo.cityName}
                    fill
                    style={{ objectFit: 'cover' }}
                    priority={index < 4}
                    loading={index < 4 ? undefined : 'lazy'}
                    unoptimized
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#222'
                  }} />
                )}
              </div>
            </div>
            
            <div style={{
              width: '100%',
              height: `${borderWidth}px`,
              backgroundColor: '#0a0a0a',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '0 6px'
            }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  style={{
                    width: `${holeWidth}px`,
                    height: `${holeHeight}px`,
                    backgroundColor: '#222',
                    borderRadius: '2px',
                    marginRight: `${holeSpacing - holeWidth}px`,
                    flexShrink: 0
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

// Компонент ссылки на галерею
const GalleryLink = memo(function GalleryLink({ onClick, firstScreenProgress }) {
  const [isHovered, setIsHovered] = useState(false)
  const isActive = firstScreenProgress > 0.65

  const color = (isHovered || isActive) ? '#ff0000' : '#ffffff'

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        bottom: 'calc((clamp(32px, 6vw, 72px) * 2 + 16px) * 1.5)',
        right: '32px',
        color: color,
        fontFamily: "'Science Gothic', monospace",
        fontWeight: 'bold',
        zIndex: 100,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)',
        transition: 'color 0.3s ease'
      }}
      className="gallery-link"
    >
      <span style={{
        fontSize: 'clamp(24px, 4vw, 48px)',
        letterSpacing: '0.05em',
        position: 'relative'
      }}>
        галерея
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: (isHovered || isActive) ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: 0,
            right: 0,
            height: '3px',
            backgroundColor: '#ff0000',
            transformOrigin: 'left center'
          }}
        />
      </span>
      <span style={{
        fontSize: 'clamp(16px, 2.5vw, 28px)',
        letterSpacing: '0.05em',
        position: 'relative'
      }}>
        <span style={{ color: '#ff0000' }}>Л</span>окаций
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: (isHovered || isActive) ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: '#ff0000',
            transformOrigin: 'left center'
          }}
        />
      </span>
    </motion.div>
  )
})

// Плавающая галерея для просмотра фото
function PhotoViewer({ frames, currentIndex, onClose, onPrev, onNext, onPrevLenta, onNextLenta, cityName }) {
  const currentFrames = frames || []
  const currentFrame = currentFrames[currentIndex]

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'ArrowUp') onPrevLenta()
      else if (e.key === 'ArrowDown') onNextLenta()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onPrev, onNext, onPrevLenta, onNextLenta, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: 'calc(var(--vh, 1vh) * 100)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 200000,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <button onClick={(e) => { e.stopPropagation(); onClose() }} style={{ position: 'absolute', top: '20px', right: '20px', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', fontSize: '28px', cursor: 'pointer', zIndex: 200001 }}>×</button>
      <button onClick={(e) => { e.stopPropagation(); onPrev() }} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', zIndex: 200001 }}>‹</button>
      <button onClick={(e) => { e.stopPropagation(); onNext() }} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', zIndex: 200001 }}>›</button>
      <button onClick={(e) => { e.stopPropagation(); onPrevLenta() }} style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', zIndex: 200001 }}>↑</button>
      <button onClick={(e) => { e.stopPropagation(); onNextLenta() }} style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', zIndex: 200001 }}>↓</button>
      {currentFrame && (
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '80vw', maxHeight: '70vh', position: 'relative' }}>
          {currentFrame.type === 'image' ? (
            <Image 
              src={currentFrame.fullSrc || currentFrame.src} 
              alt={cityName} 
              width={1920} 
              height={1080}
              unoptimized
              style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain' }} 
            />
          ) : (
            <div style={{ width: '60vw', height: '50vh', backgroundColor: currentFrame.value || '#333' }} />
          )}
          <div style={{ position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '14px', fontFamily: "'Slovic', sans-serif", whiteSpace: 'nowrap' }}>
            {cityName} — {currentIndex + 1} / {currentFrames.length}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Компонент Галерея - выдвижная панель как страница книги
function Gallery({ onClose, lentaIndex, allLentas, embeddedImages }) {
  const [loadedLentas, setLoadedLentas] = useState({})
  const [photoViewer, setPhotoViewer] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  useEffect(() => {
    if (!allLentas || allLentas.length === 0) return
    allLentas.forEach(lenta => {
      const folderId = lenta.folderId
      // Проверяем наличие файлов в public/photos
      // Пытаемся загрузить изображения - начинаем с 1, пока не найдем отсутствующий
      const images = []
      const embeddedCount = embeddedImages?.[folderId]?.length || 0; const maxPhotos = Math.max(embeddedCount, 1); for (let i = 1; i <= maxPhotos; i++) {
        images.push({
          type: 'image',
          src: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/${i}_gallery.webp`, // gallery версия для списка
          fullSrc: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/${i}.webp`, // полная версия для просмотра
          thumbSrc: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/${i}_thumb.webp` // thumbnail для превью
        })
      }
      if (images.length > 0) {
        setLoadedLentas(prev => ({ ...prev, [lenta.id]: images }))
      }
    })
  }, [allLentas, embeddedImages])

  const handlePrevFrame = () => {
    if (!photoViewer) return
    const frames = loadedLentas[allLentas[photoViewer.lentaIndex]?.id] || []
    setPhotoViewer(prev => ({ ...prev, frameIndex: prev.frameIndex > 0 ? prev.frameIndex - 1 : frames.length - 1 }))
  }

  const handleNextFrame = () => {
    if (!photoViewer) return
    const frames = loadedLentas[allLentas[photoViewer.lentaIndex]?.id] || []
    setPhotoViewer(prev => ({ ...prev, frameIndex: prev.frameIndex < frames.length - 1 ? prev.frameIndex + 1 : 0 }))
  }

  const handlePrevLenta = () => {
    if (!photoViewer || !allLentas) return
    setPhotoViewer(prev => ({ lentaIndex: prev.lentaIndex > 0 ? prev.lentaIndex - 1 : allLentas.length - 1, frameIndex: 0 }))
  }

  const handleNextLenta = () => {
    if (!photoViewer || !allLentas) return
    setPhotoViewer(prev => ({ lentaIndex: prev.lentaIndex < allLentas.length - 1 ? prev.lentaIndex + 1 : 0, frameIndex: 0 }))
  }

  const marginSize = isMobile ? '2.5em' : '5em'
  const panelWidth = 'min(500px, calc(100vw - 4em))'
  const borderRadius = isMobile ? '12px' : '24px'

  // Параметры для "братьев-листов"
  const siblings = [
    { offset: 3, delay: 0.02, stiffness: 220, opacity: 0.7 },
    { offset: 6, delay: 0.04, stiffness: 240, opacity: 0.5 },
    { offset: 9, delay: 0.06, stiffness: 260, opacity: 0.3 }
  ]

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100000,
          cursor: 'pointer'
        }}
      />
      
      {/* Братья-листы (сзади) */}
      {siblings.map((sibling, i) => (
        <motion.div
          key={`sibling-${i}`}
          initial={{ x: '100%', y: 0 }}
          animate={{ x: `-${sibling.offset}px`, y: `${sibling.offset}px` }}
          exit={{ x: '100%', y: 0 }}
          transition={{ 
            type: 'spring', 
            damping: 30, 
            stiffness: sibling.stiffness,
            delay: sibling.delay
          }}
          style={{
            position: 'fixed',
            top: marginSize,
            right: sibling.offset,
            width: panelWidth,
            height: `calc(100vh - ${marginSize} * 2)`,
            backgroundColor: '#1a1a1a',
            zIndex: 100001 - (i + 1),
            borderTopLeftRadius: borderRadius,
            borderBottomLeftRadius: borderRadius,
            opacity: sibling.opacity,
            pointerEvents: 'none',
            ...(i === 2 ? {
              borderLeft: '2px solid #ff0000',
              borderTop: '2px solid #ff0000',
              borderBottom: '2px solid #ff0000'
            } : {})
          }}
        />
      ))}
      
      {/* Основная галерея */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: marginSize,
          right: 0,
          width: panelWidth,
          height: `calc(100vh - ${marginSize} * 2)`,
          backgroundColor: '#1a1a1a',
          zIndex: 100001,
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderTopLeftRadius: borderRadius,
          borderBottomLeftRadius: borderRadius
        }}
      >
        <div style={{ padding: isMobile ? '10px 12px' : '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, position: 'relative' }}>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(16px, 3.5vw, 28px)', fontFamily: "'Slovic', sans-serif", margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'baseline', gap: '0.3em' }}>
            <span style={{ fontSize: '0.8em' }}>Галерея</span>
            <span><span style={{ color: '#ff0000' }}>Л</span>окаций</span>
          </h2>
          <button onClick={onClose} style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '10px 6px' : '16px 12px', display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
          {allLentas && allLentas.map((lenta, idx) => {
            const frames = loadedLentas[lenta.id] || []
            const scale = isMobile ? 0.85 : 1
            const frameWidth = 130 * scale
            const frameHeight = 85 * scale
            const borderWidth = 12 * scale
            const innerPadding = 4 * scale
            const totalWidth = frameWidth * frames.length
            
            return (
              <div key={lenta.id} style={{ position: 'relative' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(11px, 1.8vw, 14px)', fontFamily: "'Slovic', sans-serif", marginBottom: '8px', paddingLeft: '6px' }}>
                  <span style={{ color: '#ffffff' }}>{frames.length}</span> фото
                </div>
                
                <div style={{ 
                  position: 'relative',
                  display: 'flex', 
                  gap: 0, 
                  overflowX: 'auto',
                  paddingBottom: '2px',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.3) transparent'
                }}>
                  {frames.length > 0 ? (
                    <>
                      <LentaPerforationTexture 
                        width={totalWidth}
                        height={borderWidth}
                        position="top"
                        scale={scale * 0.8}
                      />
                      <LentaPerforationTexture 
                        width={totalWidth}
                        height={borderWidth}
                        position="bottom"
                        scale={scale * 0.8}
                      />
                      {frames.map((frame, frameIdx) => (
                        <div
                          key={frameIdx}
                          onClick={() => setPhotoViewer({ lentaIndex: idx, frameIndex: frameIdx })}
                          style={{
                            width: `${frameWidth}px`,
                            height: `${frameHeight + borderWidth * 2}px`,
                            flexShrink: 0,
                            position: 'relative',
                            backgroundColor: '#000000',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,0,0,0.3)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          <div style={{
                            position: 'absolute',
                            top: `${borderWidth}px`,
                            left: `${innerPadding}px`,
                            right: `${innerPadding}px`,
                            bottom: `${borderWidth}px`,
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            {frame.type === 'image' ? (
                                <Image
                                  src={frame.src}
                                  alt={`Photo ${frameIdx + 1}`}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                  loading="lazy"
                                  unoptimized
                                />
                            ) : (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: frame.value || '#333'
                              }} />
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '16px' }}>Загрузка...</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {photoViewer && (
        <PhotoViewer
          frames={loadedLentas[allLentas[photoViewer.lentaIndex]?.id] || []}
          currentIndex={photoViewer.frameIndex}
          onClose={() => setPhotoViewer(null)}
          onPrev={handlePrevFrame}
          onNext={handleNextFrame}
          onPrevLenta={handlePrevLenta}
          onNextLenta={handleNextLenta}
          cityName={CITY_NAMES[photoViewer.lentaIndex] || `Альбом ${photoViewer.lentaIndex + 1}`}
        />
      )}
    </>
  )
}

const ProgressChart = memo(function ProgressChart({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)

  // Таймер для автоматического изменения значений диаграммы каждые 3 секунды
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Циклическое изменение от 0 до 100 и обратно, шаг 5 для заметных изменений
        const newProgress = prev + 5
        return newProgress > 100 ? 0 : newProgress
      })
    }, 3000) // Обновление каждые 3 секунды

    return () => clearInterval(interval)
  }, [])

  // Внешний круг - больше элементов, зависящих от скролла
  const outerData = [
    { name: 'P1', value: progress }, // 0-100%
    { name: 'P2', value: progress * 0.7 }, // 0-70%
    { name: 'P3', value: progress * 0.5 }, // 0-50%
    { name: 'P4', value: progress * 0.3 }, // 0-30%
    { name: 'A', value: 25 + progress * 0.2 }, // Двигается вверх
    { name: 'B', value: 30 - progress * 0.15 }, // Двигается вниз
    { name: 'C', value: 20 + progress * 0.4 }, // Двигается вверх
    { name: 'D', value: 35 - progress * 0.25 }, // Двигается вниз
    { name: 'E', value: 15 + progress * 0.35 }, // Двигается вверх
    { name: 'F', value: 40 - progress * 0.2 } // Двигается вниз
  ]

  // Внутренний круг - тоже с движущимися элементами
  const innerData = [
    { name: 'IP1', value: progress * 0.8 }, // 0-80%
    { name: 'IP2', value: progress * 0.6 }, // 0-60%
    { name: 'IP3', value: progress * 0.4 }, // 0-40%
    { name: 'IA', value: 20 + progress * 0.3 }, // Двигается вверх
    { name: 'IB', value: 25 - progress * 0.2 }, // Двигается вниз
    { name: 'IC', value: 15 + progress * 0.5 }, // Двигается вверх
    { name: 'ID', value: 30 - progress * 0.3 } // Двигается вниз
  ]

  return (
    <div key="progress-chart-container" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PieChart key="pie-chart" width={600} height={600}>
        {/* Внешний круг */}
        <Pie
          data={outerData}
          cx="50%"
          cy="50%"
          innerRadius={120}
          outerRadius={200}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          isAnimationActive={false}
          stroke="#ffffff"
          strokeWidth={3}
          paddingAngle={2}
        >
          {outerData.map((entry, index) => (
            <Cell 
              key={`outer-cell-${index}`} 
              fill="rgba(255, 255, 255, 0.3)"
              stroke="#ffffff"
              strokeWidth={3}
            />
          ))}
        </Pie>
        {/* Внутренний круг */}
        <Pie
          data={innerData}
          cx="50%"
          cy="50%"
          innerRadius={20}
          outerRadius={110}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          isAnimationActive={false}
          stroke="#ffffff"
          strokeWidth={2}
          paddingAngle={1.5}
        >
          {innerData.map((entry, index) => (
            <Cell 
              key={`inner-cell-${index}`} 
              fill="rgba(255, 255, 255, 0.3)"
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}
        </Pie>
      </PieChart>
    </div>
  )
})

// Компонент линейной диаграммы с точками, зависящими от скролла
const LineChartComponent = memo(function LineChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef(null)

  // Отслеживаем размеры контейнера
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) {
          setContainerSize({ width, height })
        }
      }
    }
    
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Таймер для автоматического изменения значений диаграммы каждые 3 секунды
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Циклическое изменение от 0 до 100 и обратно, шаг 5 для заметных изменений
        const newProgress = prev + 5
        return newProgress > 100 ? 0 : newProgress
      })
    }, 3000) // Обновление каждые 3 секунды

    return () => clearInterval(interval)
  }, [])

  // Мемоизация данных для предотвращения перерисовки точек (Dots)
  const data = useMemo(() => [
    { name: 'A', value: 20 + progress * 0.3, value2: 30 - progress * 0.2 }, // Первая линия вверх, вторая вниз
    { name: 'B', value: 50 - progress * 0.2, value2: 40 + progress * 0.3 }, // Первая вниз, вторая вверх
    { name: 'C', value: 30 + progress * 0.4, value2: 50 - progress * 0.25 }, // Первая вверх, вторая вниз
    { name: 'D', value: 60 - progress * 0.3, value2: 35 + progress * 0.4 }, // Первая вниз, вторая вверх
    { name: 'E', value: 40 + progress * 0.25, value2: 55 - progress * 0.15 }, // Первая вверх, вторая вниз
    { name: 'F', value: 70 - progress * 0.35, value2: 25 + progress * 0.5 }, // Первая вниз, вторая вверх
    { name: 'G', value: 25 + progress * 0.5, value2: 60 - progress * 0.3 }, // Первая вверх, вторая вниз
    { name: 'H', value: 55 - progress * 0.15, value2: 45 + progress * 0.2 }, // Первая вниз, вторая вверх
    { name: 'I', value: 35 + progress * 0.3, value2: 50 - progress * 0.35 }, // Первая вверх, вторая вниз
    { name: 'J', value: 65 - progress * 0.4, value2: 30 + progress * 0.45 }  // Первая вниз, вторая вверх
  ], [progress])

  // Не рендерим график, пока контейнер не имеет размеров
  if (containerSize.width === 0 || containerSize.height === 0) {
    return (
      <div
        ref={containerRef}
        key="line-chart-container"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          padding: 0,
          zIndex: 1,
          pointerEvents: 'none',
          minWidth: '200px',
          minHeight: '200px'
        }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      key="line-chart-container"
      style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      padding: 0,
      zIndex: 1,
      pointerEvents: 'none',
      minWidth: '200px',
      minHeight: '200px'
    }}>
      <ResponsiveContainer key="line-responsive-container" width="100%" height="100%" minWidth={200} minHeight={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis 
            dataKey="name" 
            stroke="#ffffff"
            tick={{ fill: '#ffffff' }}
            hide={true}
          />
          <YAxis 
            stroke="#ffffff"
            tick={{ fill: '#ffffff' }}
            domain={[0, 100]}
            hide={true}
          />
          <Tooltip
            key="line-tooltip"
            cursor={false}
            isAnimationActive={false}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff'
            }}
          />
          {/* Старая линия с точками */}
          <Line
            key="line1"
            type="monotone"
            dataKey="value"
            stroke="#ffffff"
            strokeWidth={3}
            dot={{ fill: '#ffffff', r: 6 }}
            activeDot={{ r: 8 }}
          />
          {/* Новая угловатая линия без точек */}
          <Line
            key="line2"
            type="step"
            dataKey="value2"
            stroke="#ffffff"
            strokeWidth={2}
            dot={false}
            strokeOpacity={0.7}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})

// Компонент радарной диаграммы
const RadarChartComponent = memo(function RadarChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef(null)

  // Отслеживаем размеры контейнера
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) {
          setContainerSize({ width, height })
        }
      }
    }
    
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Таймер для автоматического изменения значений диаграммы каждые 3 секунды
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Циклическое изменение от 0 до 100 и обратно, шаг 5 для заметных изменений
        const newProgress = prev + 5
        return newProgress > 100 ? 0 : newProgress
      })
    }, 3000) // Обновление каждые 3 секунды

    return () => clearInterval(interval)
  }, [])

  const data = [
    { subject: 'A', value: 50 + progress * 0.3, fullMark: 100 },
    { subject: 'B', value: 60 - progress * 0.2, fullMark: 100 },
    { subject: 'C', value: 40 + progress * 0.4, fullMark: 100 },
    { subject: 'D', value: 70 - progress * 0.3, fullMark: 100 },
    { subject: 'E', value: 55 + progress * 0.25, fullMark: 100 },
    { subject: 'F', value: 45 - progress * 0.35, fullMark: 100 }
  ]

  // Не рендерим график, пока контейнер не имеет размеров
  if (containerSize.width === 0 || containerSize.height === 0) {
    return (
      <div 
        ref={containerRef}
        key="radar-chart-container" 
        style={{ width: '100%', height: '100%', minWidth: '200px', minHeight: '200px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      />
    )
  }

  return (
    <div ref={containerRef} key="radar-chart-container" style={{ width: '100%', height: '100%', minWidth: '200px', minHeight: '200px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer key="radar-responsive-container" width="100%" height="100%" minWidth={200} minHeight={200}>
        <RadarChart key="radar-chart" data={data}>
          <PolarGrid stroke="#ffffff" strokeOpacity={0.3} />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#ffffff', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fill: '#ffffff', fontSize: 10 }}
          />
          <Radar 
            name="Value" 
            dataKey="value" 
            stroke="#ffffff" 
            fill="#ffffff" 
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
})

// Компонент радиальной столбчатой диаграммы, зависимый от скролла
const RadialBarChartComponent = memo(function RadialBarChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef(null)

  // Отслеживаем размеры контейнера
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) {
          setContainerSize({ width, height })
        }
      }
    }
    
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Таймер для автоматического изменения значений диаграммы каждые 3 секунды
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Циклическое изменение от 0 до 100 и обратно, шаг 5 для заметных изменений
        const newProgress = prev + 5
        return newProgress > 100 ? 0 : newProgress
      })
    }, 3000) // Обновление каждые 3 секунды

    return () => clearInterval(interval)
  }, [])

  // Мемоизация данных для предотвращения перерисовки секторов (RadialBarSectors)
  const data = useMemo(() => [
    { name: 'A', value: 20 + progress * 0.3, fill: '#ffffff' },
    { name: 'B', value: 40 - progress * 0.2, fill: '#ffffff' },
    { name: 'C', value: 60 + progress * 0.4, fill: '#ffffff' },
    { name: 'D', value: 30 - progress * 0.3, fill: '#ffffff' },
    { name: 'E', value: 50 + progress * 0.25, fill: '#ffffff' },
    { name: 'F', value: 70 - progress * 0.35, fill: '#ffffff' }
  ], [progress])

  // Не рендерим график, пока контейнер не имеет размеров
  if (containerSize.width === 0 || containerSize.height === 0) {
    return (
      <div 
        ref={containerRef}
        key="radial-bar-chart-container" 
        style={{ width: '100%', height: '100%', minWidth: '200px', minHeight: '200px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      />
    )
  }

  return (
    <div ref={containerRef} key="radial-bar-chart-container" style={{ width: '100%', height: '100%', minWidth: '200px', minHeight: '200px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer key="radial-responsive-container" width="100%" height="100%" minWidth={200} minHeight={200}>
        <RadialBarChart
          key="radial-bar-chart" 
          cx="50%" 
          cy="50%" 
          innerRadius="20%" 
          outerRadius="80%" 
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            key="radial-bar"
            dataKey="value"
            cornerRadius={4}
            fill="rgba(255, 255, 255, 0.3)"
            stroke="#ffffff"
            strokeWidth={2}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  )
})

// Компонент карусели с постерами фильмов (вращающаяся карусель)
const MoviesCarousel = memo(function MoviesCarousel({ movies, mouseParallaxValues = null }) {
  const { isParallaxEnabled } = useParallaxStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [wasDragging, setWasDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)
  const carouselRef = useRef(null)
  const autoPlayRef = useRef(null)
  const [isInViewport, setIsInViewport] = useState(false)

  // Проверка видимости компонента в viewport
  useEffect(() => {
    if (!carouselRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInViewport(entry.isIntersecting)
        })
      },
      {
        threshold: 0.1 // Компонент считается видимым, если видно хотя бы 10%
      }
    )

    observer.observe(carouselRef.current)

    return () => {
      if (carouselRef.current) {
        observer.unobserve(carouselRef.current)
      }
    }
  }, [])

  // Автоматическое вращение карусели (но не скролл страницы)
  useEffect(() => {
    // Автоплей работает только когда компонент виден
    if (!isDragging && isInViewport) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % movies.length)
      }, 3000) // Меняем каждые 3 секунды
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }
  }, [movies.length, isDragging, isInViewport])

  // Обработчики для перетаскивания
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartX(e.clientX)
    setDragOffset(0)
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const diff = e.clientX - startX
    setDragOffset(diff)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    
    const hadDrag = Math.abs(dragOffset) > 10
    setWasDragging(hadDrag)
    
    // Если перетащили достаточно далеко, меняем слайд
    if (Math.abs(dragOffset) > 100) {
      if (dragOffset > 0) {
        setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length)
      } else {
        setCurrentIndex((prev) => (prev + 1) % movies.length)
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => setWasDragging(false), 100)
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      setDragOffset(0)
    }
  }

  // Обработчик клика на контейнер для навигации слева/справа
  const handleContainerClick = (e) => {
    // Не обрабатываем клик, если был drag
    if (wasDragging || isDragging || Math.abs(dragOffset) > 5) {
      return
    }

    // Проверяем, что клик не был на самой карточке
    const target = e.target
    const clickedOnCard = target.closest('[data-movie-card]')
    if (clickedOnCard) {
      return // Клик был на карточке, обработается handleClick
    }

    // Получаем позицию клика относительно контейнера
    if (!carouselRef.current) return
    const rect = carouselRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const centerX = rect.width / 2

    // Определяем, слева или справа от центра был клик
    if (clickX < centerX) {
      // Клик слева - переходим к предыдущему
      setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length)
    } else {
      // Клик справа - переходим к следующему
      setCurrentIndex((prev) => (prev + 1) % movies.length)
    }
  }

  // Обработчики для touch событий (мобильные устройства)
  const handleTouchStart = (e) => {
    setIsDragging(true)
    setTouchStartX(e.touches[0].clientX)
    setDragOffset(0)
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const diff = e.touches[0].clientX - touchStartX
    setDragOffset(diff)
  }

  const handleTouchEnd = (e) => {
    if (!isDragging) return
    
    const hadDrag = Math.abs(dragOffset) > 10
    setWasDragging(hadDrag)
    
    // Если перетащили достаточно далеко, меняем слайд
    if (Math.abs(dragOffset) > 100) {
      if (dragOffset > 0) {
        setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length)
      } else {
        setCurrentIndex((prev) => (prev + 1) % movies.length)
      }
    } else if (Math.abs(dragOffset) <= 5) {
      // Если не было драга, обрабатываем как клик для навигации
      if (!carouselRef.current) {
        setIsDragging(false)
        setDragOffset(0)
        setTimeout(() => setWasDragging(false), 100)
        return
      }

      const rect = carouselRef.current.getBoundingClientRect()
      const touchX = e.changedTouches[0].clientX - rect.left
      const centerX = rect.width / 2

      // Проверяем, что тач не был на карточке
      const touchTarget = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
      const touchedOnCard = touchTarget?.closest('[data-movie-card]')
      
      if (!touchedOnCard) {
        // Тач был не на карточке - навигация
        if (touchX < centerX) {
          setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length)
        } else {
          setCurrentIndex((prev) => (prev + 1) % movies.length)
        }
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
    setTimeout(() => setWasDragging(false), 100)
  }

  // Вычисляем позиции для карусели (3D эффект)
  const getTransform = (index) => {
    const offset = index - currentIndex
    const absOffset = Math.abs(offset)
    const direction = offset > 0 ? 1 : -1
    
    // Если элемент далеко, скрываем его
    if (absOffset > 3) {
      return {
        transform: `translateX(${direction * 400}px) translateZ(-200px) scale(0.5)`,
        opacity: 0,
        zIndex: 0
      }
    }

    // Близкие элементы видны
    const scale = 1 - absOffset * 0.15
    const translateX = offset * 220 + (isDragging ? dragOffset : 0)
    const translateZ = -absOffset * 100
    const opacity = 1 - absOffset * 0.3

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) scale(${scale})`,
      opacity: Math.max(0, opacity),
      zIndex: movies.length - absOffset
    }
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0',
      perspective: '1000px',
      perspectiveOrigin: 'center center'
    }}>
      <div 
        ref={carouselRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleContainerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {movies.map((movie, index) => {
          const baseStyle = getTransform(index)
          const offset = Math.abs(index - currentIndex)
          
          // Определяем параллакс в зависимости от расстояния от центра
          // Параллакс работает только когда компонент в viewport и параллакс включен
          let parallaxX, parallaxY, rotateX, rotateY
          if (!isInViewport || !isParallaxEnabled) {
            // Если не в viewport или параллакс отключен - без параллакса
            parallaxX = 0
            parallaxY = 0
            rotateX = 0
            rotateY = 0
          } else if (offset === 0) {
            // Центральная карточка - сильный параллакс
            parallaxX = mouseParallaxValues?.centerX || 0
            parallaxY = mouseParallaxValues?.centerY || 0
            rotateX = mouseParallaxValues?.centerRotateX || 0
            rotateY = mouseParallaxValues?.centerRotateY || 0
          } else if (offset === 1) {
            // Близкие карточки - средний параллакс
            parallaxX = mouseParallaxValues?.nearX || 0
            parallaxY = mouseParallaxValues?.nearY || 0
            rotateX = mouseParallaxValues?.nearRotateX || 0
            rotateY = mouseParallaxValues?.nearRotateY || 0
          } else if (offset === 2) {
            // Дальние карточки - слабый параллакс
            parallaxX = mouseParallaxValues?.farX || 0
            parallaxY = mouseParallaxValues?.farY || 0
            rotateX = mouseParallaxValues?.farRotateX || 0
            rotateY = mouseParallaxValues?.farRotateY || 0
          } else {
            // Очень дальние карточки - без параллакса
            parallaxX = 0
            parallaxY = 0
            rotateX = 0
            rotateY = 0
          }
          
          const handleClick = (e) => {
            // Останавливаем всплытие, чтобы не сработал handleContainerClick
            e.stopPropagation()
            
            // Не открываем ссылку, если был drag
            if (wasDragging || isDragging) {
              e.preventDefault()
              return
            }
            if (movie.kinopoiskId) {
              window.open(`https://www.kinopoisk.ru/film/${movie.kinopoiskId}/`, '_blank')
            }
          }

          return (
            <motion.div
              key={index}
              data-movie-card
              style={{
                position: 'absolute',
                width: '200px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.6s ease',
                ...baseStyle
              }}
              onClick={handleClick}
            >
              {/* Внутренний элемент для параллакса, чтобы не ломать существующий transform */}
              <motion.div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  x: parallaxX,
                  y: parallaxY,
                  rotateX: rotateX,
                  rotateY: rotateY,
                  perspective: '1000px',
                  transformStyle: 'preserve-3d'
                }}
              >
              <div style={{
                width: '100%',
                height: '300px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                backgroundColor: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <img
                  src={movie.poster}
                  alt={movie.title}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                  onError={(e) => {
                    // При ошибке скрываем изображение и показываем название
                    e.target.style.display = 'none'
                    const parent = e.target.parentElement
                    if (!parent.querySelector('.fallback-text')) {
                      const fallback = document.createElement('div')
                      fallback.className = 'fallback-text'
                      fallback.style.cssText = 'color: #ffffff; font-family: "Slovic", sans-serif; font-size: 1.2rem; text-align: center; padding: 1rem; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%;'
                      fallback.textContent = movie.title
                      parent.appendChild(fallback)
                    }
                  }}
                />
              </div>
              <div style={{
                color: '#ffffff',
                fontSize: '0.9rem',
                fontFamily: "'Slovic', sans-serif",
                textAlign: 'center',
                padding: '0.5rem',
                lineHeight: '1.3'
              }}>
                {movie.title}
              </div>
              </motion.div>
            </motion.div>
          )
        })}
      </div>
      
      {/* Индикаторы точек */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginTop: '2rem'
      }}>
        {movies.map((_, index) => (
          <div
            key={index}
            onClick={() => setCurrentIndex(index)}
            style={{
              width: index === currentIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: index === currentIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения - перерисовываем только если изменились movies
  // mouseParallaxValues - это motion values, они не должны вызывать перерисовки
  return prevProps.movies === nextProps.movies
})

// Компонент текстуры с закругленными прямоугольниками для границ экрана
function PerforatedBorderTexture({ position = 'top' }) {
  // Параметры текстуры
  const gap = 5
  const rectWidth = 20
  const rectHeight = 16
  const rectSpacing = rectWidth + gap * 2
  const borderRadius = 2
  const edgeOffset = 20

  const createPattern = () => {
    const svg = `<svg width="${rectSpacing}" height="${rectHeight}" xmlns="http://www.w3.org/2000/svg">
<rect x="${gap}" y="0" width="${rectWidth}" height="${rectHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="#ffffff" opacity="0.4"/>
</svg>`
    const encoded = encodeURIComponent(svg)
    return `data:image/svg+xml;charset=utf-8,${encoded}`
  }

  const patternUrl = createPattern()

  // Автономное движение — чистый CSS, без JS
  // Обе полосы двигаются вправо (как в старом проекторе)
  return (
    <div
      className="perf-scroll-right"
      style={{
        position: 'absolute',
        [position]: `${edgeOffset}px`,
        left: 0,
        width: '100%',
        height: `${rectHeight + 4}px`,
        backgroundImage: `url("${patternUrl}")`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: `${rectSpacing}px ${rectHeight}px`,
        pointerEvents: 'none',
        zIndex: 25
      }}
    />
  )
}

// Компонент для горизонтальных царапин, которые перерисовываются при движении мыши
function ScratchesComponent({ count = 15, scratchRedrawTrigger }) {
  const [scratches, setScratches] = useState([])
  const [renderKey, setRenderKey] = useState(0)
  
  // Перерисовываем царапины при изменении триггера
  useMotionValueEvent(scratchRedrawTrigger, 'change', () => {
    // Генерируем новые позиции и параметры для всех царапин
    setScratches(Array.from({ length: count }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      width: Math.random() * 400 + 200,
      rotate: Math.random() * 2 - 1,
      opacity: 0.3 + Math.random() * 0.3
    })))
    // Меняем key для полной перерисовки элементов
    setRenderKey(prev => prev + 1)
  })
  
  // Инициализация при монтировании
  useEffect(() => {
    setScratches(Array.from({ length: count }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      width: Math.random() * 400 + 200,
      rotate: Math.random() * 2 - 1,
      opacity: 0.3 + Math.random() * 0.3
    })))
  }, [count])
  
  return (
    <>
      {scratches.map((scratch) => (
        <div
          key={`${scratch.id}-${renderKey}`} // Меняем key для полной перерисовки
          style={{
            position: 'absolute',
            top: `${scratch.top}%`,
            left: `${scratch.left}%`,
            width: `${scratch.width}px`,
            height: '2px',
            background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent)',
            pointerEvents: 'none',
            zIndex: 102,
            opacity: scratch.opacity,
            transform: `rotate(${scratch.rotate}deg)`,
            boxShadow: '0 0 3px rgba(255, 255, 255, 0.2)'
            // Убрали transition - элементы появляются мгновенно в новых местах
          }}
        />
      ))}
    </>
  )
}

// Компонент слоя помех с поддержкой скролла и мыши (без движения, только изменение параметров)
function GrainLayerComponent({ zIndex, opacity, backgroundImage, backgroundSize, mixBlendMode, filter, grainBackgroundPosition, grainNoiseOpacity = null }) {
  const layerRef = useRef(null)
  
  useMotionValueEvent(grainBackgroundPosition, 'change', (latest) => {
    if (layerRef.current) {
      layerRef.current.style.backgroundPosition = latest
    }
  })
  
  // Изменяем opacity на основе мыши и скролла
  useEffect(() => {
    if (!grainNoiseOpacity) return
    
    const unsubscribe = grainNoiseOpacity.on('change', (latest) => {
      if (layerRef.current) {
        layerRef.current.style.opacity = latest * opacity
      }
    })
    
    return () => unsubscribe()
  }, [grainNoiseOpacity, opacity])
  
  return (
    <div
      ref={layerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
        opacity: grainNoiseOpacity ? undefined : opacity,
        backgroundImage,
        backgroundSize,
        mixBlendMode,
        filter
      }}
    />
  )
}

// Мемоизированный контейнер для диаграмм с параллаксом
const ChartContainer = memo(({ children, style }) => (
  <motion.div
    style={{
      position: 'absolute',
      left: '50%',
      top: '2rem', // default top
      zIndex: 12,
      width: '25vw',
      height: '25vw',
      maxWidth: '300px',
      maxHeight: '300px',
      pointerEvents: 'none',
      perspective: '1000px',
      transformStyle: 'preserve-3d',
      ...style
    }}
  >
    {children}
  </motion.div>
))

// Мемоизированный контейнер для центральной большой диаграммы
const CenterChartContainer = memo(({ children, style }) => (
  <motion.div
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      zIndex: 18,
      width: '80vw',
      height: '80vw',
      maxWidth: '1000px',
      maxHeight: '1000px',
      pointerEvents: 'none',
      perspective: '1000px',
      transformStyle: 'preserve-3d',
      ...style
    }}
  >
    {children}
  </motion.div>
))

// Мемоизированный индикатор прогресса
const ProgressIndicator = memo(({ progressText }) => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    pointerEvents: 'none',
    zIndex: 1000
  }}>
    <div style={{
      position: 'sticky',
      top: '45px',
      width: 'fit-content',
      marginLeft: 'auto',
      marginRight: '16px',
      color: '#ffffff',
      fontSize: 'clamp(14px, 2vw, 18px)',
      fontFamily: "'Science Gothic', monospace",
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '8px 16px',
      borderRadius: '4px',
      backdropFilter: 'blur(4px)',
      pointerEvents: 'none'
    }}>
      Запуск процессов: {progressText}%
    </div>
  </div>
))

// Мемоизированный список пунктов договора
const ContractItemsList = memo(({ progressMotionValue }) => (
  <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 'clamp(16px, 3vw, 2em)',
    paddingRight: 'clamp(16px, 3vw, 2em)'
  }}>
    <ContractItem text="Подбор и согласование локаций любой сложности по всей России" progress={progressMotionValue} threshold={35} textColor="#ffffff" />
    <ContractItem text="Согласуем все договоренности и разрешения" progress={progressMotionValue} threshold={40} textColor="#ffffff" />
    <ContractItem text="Полное сопровождение съемок и постпродакшен" progress={progressMotionValue} threshold={50} textColor="#ffffff" />
    <ContractItem text="Кинопроизводство полного цикла" progress={progressMotionValue} threshold={60} textColor="#ffffff" />
    <ContractItem text="Обеспечим дистрибуцию и промо-компанию" progress={progressMotionValue} threshold={65} textColor="#ffffff" />
  </div>
))

// Компонент эффекта помех/повреждения пленки для второго экрана
function FilmGrainEffect({ scrollProgress }) {
  const [grainIntensity, setGrainIntensity] = useState(0)
  const [scratchOffset, setScratchOffset] = useState(0)
  const [rgbSplit, setRgbSplit] = useState(0)
  const [flicker, setFlicker] = useState(1)

  // Обновляем интенсивность эффектов на основе скролла
  useMotionValueEvent(scrollProgress, "change", (latest) => {
    const progress = Math.min(Math.max(latest, 0), 1)
    setGrainIntensity(progress)
    setScratchOffset(progress * 200)
    setRgbSplit(progress * 8) // Максимальное смещение RGB каналов 8px
    // Flicker эффект - случайные вспышки при скролле
    setFlicker(1 - (Math.random() * 0.15 * progress))
  })

  // Генерируем случайные царапины
  const scratches = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    width: Math.random() * 300 + 100,
    opacity: Math.random() * 0.5 + 0.2,
    delay: Math.random() * 2
  }))

  return (
    <>
      {/* Основной слой зернистости - более заметный */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 100,
          opacity: Math.max(0.3, grainIntensity * 0.8),
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.3) 3px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.2) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.2) 3px),
            repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.05) 3px)
          `,
          backgroundSize: '150% 150%',
          mixBlendMode: 'overlay',
          filter: 'contrast(1.3) brightness(0.85)'
        }}
        animate={{
          backgroundPosition: [
            `${Math.random() * 100}% ${Math.random() * 100}%`,
            `${Math.random() * 100}% ${Math.random() * 100}%`
          ]
        }}
        transition={{
          duration: 0.05,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
      />

      {/* RGB Split эффект - смещение цветовых каналов */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 101,
          opacity: Math.max(0.2, grainIntensity * 0.7),
          background: `
            linear-gradient(to right, 
              rgba(255, 0, 0, 0.2) 0%, 
              transparent ${rgbSplit}px,
              transparent calc(100% - ${rgbSplit}px),
              rgba(0, 0, 255, 0.2) 100%)
          `,
          mixBlendMode: 'screen',
          transform: `translateX(${rgbSplit * 0.3}px)`,
          filter: `blur(${rgbSplit * 0.1}px)`
        }}
      />

      {/* Горизонтальные царапины */}
      {scratches.map((scratch) => (
        <motion.div
          key={scratch.id}
          style={{
            position: 'absolute',
            top: `${scratch.top}%`,
            left: `${scratch.left}%`,
            width: `${scratch.width}px`,
            height: '3px',
            background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent)',
            pointerEvents: 'none',
            zIndex: 102,
            opacity: Math.max(0.1, scratch.opacity * Math.max(0.3, grainIntensity)),
            transform: `translateX(${scratchOffset * 0.5}px)`,
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.3)'
          }}
          animate={{
            x: [0, scratchOffset * 0.5, 0],
            opacity: [
              Math.max(0.1, scratch.opacity * Math.max(0.3, grainIntensity) * 0.5),
              Math.max(0.2, scratch.opacity * Math.max(0.3, grainIntensity)),
              Math.max(0.1, scratch.opacity * Math.max(0.3, grainIntensity) * 0.5)
            ]
          }}
          transition={{
            duration: 1.5 + Math.random() * 2,
            repeat: Infinity,
            delay: scratch.delay,
            ease: 'linear'
          }}
        />
      ))}

      {/* Вертикальные полосы повреждений */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 103,
          opacity: Math.max(0.2, grainIntensity * 0.6),
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 2px,
              rgba(255, 255, 255, 0.1) 2px,
              rgba(255, 255, 255, 0.1) 3px,
              transparent 3px,
              transparent 5px
            )
          `,
          backgroundSize: '80px 100%',
          mixBlendMode: 'overlay'
        }}
        animate={{
          backgroundPosition: [`${scratchOffset * 0.3}px 0`, `${scratchOffset * 0.3 + 80}px 0`]
        }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Flicker эффект - мерцание */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 104,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          mixBlendMode: 'overlay'
        }}
        animate={{
          opacity: [flicker * 0.4, flicker * 0.8, flicker * 0.4]
        }}
        transition={{
          duration: 0.08 + Math.random() * 0.15,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Дополнительный шум через canvas-like эффект */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 99,
          opacity: Math.max(0.2, grainIntensity * 0.6),
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0, 0, 0, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 10% 80%, rgba(255, 255, 255, 0.04) 0%, transparent 40%),
            radial-gradient(circle at 90% 20%, rgba(0, 0, 0, 0.04) 0%, transparent 40%)
          `,
          backgroundSize: '150% 150%',
          mixBlendMode: 'difference',
          filter: 'blur(1px)'
        }}
        animate={{
          backgroundPosition: [
            `${Math.random() * 50}% ${Math.random() * 50}%`,
            `${Math.random() * 50 + 50}% ${Math.random() * 50 + 50}%`
          ]
        }}
        transition={{
          duration: 2 + Math.random() * 1.5,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut'
        }}
      />
      
      {/* Дополнительный слой статического шума */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 105,
          opacity: Math.max(0.15, grainIntensity * 0.5),
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 1px, rgba(0,0,0,0.03) 2px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 1px, rgba(0,0,0,0.03) 2px)
          `,
          backgroundSize: '4px 4px',
          mixBlendMode: 'overlay',
          filter: 'contrast(1.5)'
        }}
        animate={{
          opacity: [
            Math.max(0.15, grainIntensity * 0.5),
            Math.max(0.25, grainIntensity * 0.7),
            Math.max(0.15, grainIntensity * 0.5)
          ]
        }}
        transition={{
          duration: 0.1,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </>
  )
}

// Компонент звездного неба с мерцающими звездами
// Компонент сетки с названиями партнеров
function PartnersGrid({ partners }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '2rem',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      {partners.map((partner, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            minHeight: '150px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <div style={{
            color: '#ffffff',
            fontFamily: "'Slovic', sans-serif",
            fontSize: '1.5rem',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {partner.name}
          </div>
        </div>
      ))}
    </div>
  )
}

const StarrySky = React.memo(function StarrySky({ starCount = 50 }) {
  const [stars] = useState(() => {
    return Array.from({ length: starCount }, () => ({
      x: Math.random() * 100, // Позиция X в процентах
      y: Math.random() * 100, // Позиция Y в процентах
      size: Math.random() * 2 + 0.5, // Размер от 0.5px до 2.5px (меньше)
      baseOpacity: Math.random() * 0.4 + 0.2, // Базовая прозрачность от 0.2 до 0.6
      peakOpacity: Math.random() * 0.3 + 0.7, // Пиковая прозрачность от 0.7 до 1.0
      duration: Math.random() * 2 + 1.5, // Длительность анимации от 1.5 до 3.5 секунд
      delay: Math.random() * 2 // Задержка начала анимации от 0 до 2 секунд
    }))
  })

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1
    }}>
      {stars.map((star, index) => (
        <motion.div
          key={index}
          initial={{ opacity: star.baseOpacity }}
          animate={{
            opacity: [star.baseOpacity, star.peakOpacity, star.baseOpacity]
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: `0 0 ${star.size}px rgba(255, 255, 255, 0.5)`
          }}
        />
      ))}
    </div>
  )
}, (prevProps, nextProps) => {
  // Перерисовываем только если изменился starCount
  return prevProps.starCount === nextProps.starCount
})

// Компонент ярких звезд для фона при открытии счелкунчика (без синивы, ярче, сильнее мерцают)
const BrightStarrySky = React.memo(function BrightStarrySky({ starCount = 100, isVisible = false }) {
  const [stars] = useState(() => {
    return Array.from({ length: starCount }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1, // Размер от 1px до 4px (больше)
      baseOpacity: Math.random() * 0.5 + 0.5, // Базовая прозрачность от 0.5 до 1.0 (ярче)
      peakOpacity: 1, // Пиковая прозрачность всегда 1.0 (максимальная яркость)
      duration: Math.random() * 1 + 0.5, // Длительность от 0.5 до 1.5 секунд (быстрее мерцание)
      delay: Math.random() * 1 // Задержка от 0 до 1 секунды
    }))
  })

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 0,
      backgroundColor: '#000000' // Чисто черный фон без синивы
    }}>
      {stars.map((star, index) => (
        <motion.div
          key={index}
          initial={{ opacity: star.baseOpacity }}
          animate={{
            opacity: [star.baseOpacity, star.peakOpacity, star.baseOpacity]
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.9), 0 0 ${star.size * 4}px rgba(255, 255, 255, 0.5)` // Более яркое свечение
          }}
        />
      ))}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.starCount === nextProps.starCount && prevProps.isVisible === nextProps.isVisible
})

// Компонент текстуры перфорации для лент
function LentaPerforationTexture({ width, height, position = 'top', scale = 1 }) {
  // Параметры текстуры - масштабируемые
  // Отступы одинаковые: от краев ленты и между элементами
  const gap = 5 * scale // Отступ между элементами и от краев (одинаковый)
  const rectWidth = 20 * scale
  const rectHeight = Math.min(height * 0.8, 16 * scale) // Адаптируем под высоту полосы
  // Расстояние между началами элементов = ширина элемента + gap (отступ между элементами)
  const rectSpacing = rectWidth + gap // Ширина элемента + один отступ
  const borderRadius = 2 * scale // Меньше закругление

  // Создаем SVG паттерн с закругленными прямоугольниками
  // Элемент начинается с 0, так как отступ от края уже учтен в позиции контейнера
  const createPattern = () => {
    const svg = `<svg width="${rectSpacing}" height="${rectHeight}" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="${rectWidth}" height="${rectHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="#ffffff" opacity="0.2"/>
</svg>`
    const encoded = encodeURIComponent(svg)
    return `data:image/svg+xml;charset=utf-8,${encoded}`
  }

  const patternUrl = createPattern()

  return (
    <div
      style={{
        position: 'absolute',
        [position]: 0,
        left: `${gap}px`, // Отступ от левого края
        width: `${width - gap * 2}px`, // Уменьшаем ширину на отступы с обеих сторон
        height: `${height}px`,
        backgroundImage: `url("${patternUrl}")`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: `${rectSpacing}px ${rectHeight}px`,
        backgroundPosition: '0 0',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  )
}

function KinoLenta({ folderId, progress, center, topOffset = 0, speed = 1, angle = 0, inverse = false, scale = 1, onFrameClick, lentaId, containerRef, parallaxX, parallaxY, rotateX, rotateY, embeddedImages, spreadMultiplier = 1 }) {
  const { isParallaxEnabled } = useParallaxStore()
  
  // Используем встроенные base64 изображения если доступны, иначе загружаем через API
  const [existingFileNumbers, setExistingFileNumbers] = useState([])
  
  useEffect(() => {
    if (!folderId) {
      setExistingFileNumbers([])
      return
    }
    
    // Используем только встроенные изображения - никаких запросов к серверу
    // Если файл lenta_images.js не сгенерирован (npm run embed:lenta-images), изображений не будет
    if (embeddedImages && embeddedImages[folderId] && Array.isArray(embeddedImages[folderId]) && embeddedImages[folderId].length > 0) {
      const images = embeddedImages[folderId]
      setExistingFileNumbers(images.map(img => img.fileNum))
    } else {
      // Нет встроенных изображений - пустой массив (покажутся placeholder цвета)
      setExistingFileNumbers([])
    }
  }, [folderId, embeddedImages])
  
  // Генерируем список изображений: используем встроенные base64 для мгновенной загрузки на лентах
  const frames = useMemo(() => {
    // Если есть встроенные base64 данные — используем их напрямую (мгновенная загрузка, 0 запросов)
    if (embeddedImages && embeddedImages[folderId] && Array.isArray(embeddedImages[folderId]) && embeddedImages[folderId].length > 0) {
      return embeddedImages[folderId].map((img) => ({
        type: 'image',
        src: img.data, // base64 — грузится мгновенно
        fullSrc: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/${img.fileNum}.webp`,
        gallerySrc: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/${img.fileNum}_gallery.webp`,
        isEmbedded: true
      }))
    }
    // Fallback на URL если нет встроенных данных
    if (existingFileNumbers.length > 0 && folderId) {
      return existingFileNumbers.map((fileNum) => ({
        type: 'image',
        src: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/${fileNum}_thumb.webp`,
        fullSrc: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/${fileNum}.webp`,
        gallerySrc: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/photos/${folderId}/${fileNum}_gallery.webp`,
        isEmbedded: false
      }))
    }
    
    // Fallback на случайные цвета если изображения не найдены
    return Array.from({ length: 8 }, () => {
      const r = Math.floor(Math.random() * 256)
      const g = Math.floor(Math.random() * 256)
      const b = Math.floor(Math.random() * 256)
      return { type: 'color', value: `rgb(${r}, ${g}, ${b})` }
    })
  }, [existingFileNumbers, folderId, embeddedImages])
  
  const frameCount = frames.length
  
  // Состояние для отслеживания hover на каждом кадре - временно отключено для производительности
  // const [hoveredIndex, setHoveredIndex] = useState(null)

  // progress может быть motion value или числом
  // Прямое преобразование progress в позицию без spring - синхронно со скроллом
  // Если progress - motion value, используем его напрямую, иначе создаем из числа
  const progressMotion = typeof progress === 'object' && 'get' in progress 
    ? progress 
    : useMotionValue(typeof progress === 'number' ? (progress > 1 ? progress / 100 : progress) : 0)
  
  // Если progress - число, обновляем motion value
  useEffect(() => {
    if (typeof progress === 'number') {
      const normalized = progress > 1 ? progress / 100 : progress
      progressMotion.set(normalized)
    }
  }, [progress, progressMotion])
  
  // Прямое преобразование progress в позицию - без задержки, синхронно
  // spreadMultiplier увеличивает разброс лент на узких экранах (1 на десктопе, до 2 на мобильном)
  const translateXValue = useTransform(progressMotion, (prog) => {
    let targetLeftPosition = Math.max(-300, Math.min(300, (prog - center) * 500 * speed * spreadMultiplier))
    if (inverse) {
      targetLeftPosition = -targetLeftPosition
    }
    return `translateX(${targetLeftPosition}vw)`
  })

  // Вычисляем zIndex на основе scale - крупные ленты должны быть выше визуально
  // Базовый zIndex 1000, добавляем scale * 100 для правильного порядка
  const zIndex = 1000 + Math.round(scale * 100)

  return (
    // Внешний контейнер - позиционирование внутри скроллящейся области
    // Используем position: absolute для позиционирования относительно скроллящегося контейнера
          <div style={{
      position: 'absolute',
      top: `calc(50vh + ${topOffset}vh)`,
      left: '50%',
      transform: 'translate(-50%, -50%)',
      transformOrigin: 'center center',
      zIndex: zIndex,
      pointerEvents: 'none'
          }}>
      {/* Контейнер поворота - поворачивается на angle градусов + параллакс */}
            <motion.div
        style={{
        rotate: `${angle}deg`,
        transformOrigin: 'center center',
        pointerEvents: 'none',
        x: isParallaxEnabled ? (parallaxX || 0) : 0,
        y: isParallaxEnabled ? (parallaxY || 0) : 0,
        rotateX: isParallaxEnabled ? (rotateX || 0) : 0,
        rotateY: isParallaxEnabled ? (rotateY || 0) : 0,
        perspective: '1000px'
      }}>
        {/* Контейнер движения - двигается по повернутой оси X */}
        <motion.div
          style={{
            display: 'flex',
            gap: 0, // Убираем отступы между кадрами для цельной ленты
            alignItems: 'stretch',
            justifyContent: 'center',
            pointerEvents: 'none', // Контейнер не перехватывает события - скролл проходит сквозь
            transform: translateXValue,
            position: 'relative' // Для позиционирования перфорации на уровне всей ленты
          }}
          onWheel={(e) => {
            // Пробрасываем скролл событие - не блокируем его
            e.stopPropagation()
          }}
          onMouseDown={(e) => {
            // Не блокируем события мыши для скролла
            e.stopPropagation()
          }}
        >
          {(() => {
            // Вычисляем параметры один раз для всей ленты
            const frameWidth = 120 * scale
            const frameHeight = 80 * scale
            const borderWidth = 12 * scale
            const totalWidth = frameWidth * frameCount
            
            return (
              <>
                {/* Текстура перфорации на верхней черной полосе - на уровне всей ленты */}
                <LentaPerforationTexture 
                  width={totalWidth}
                  height={borderWidth}
                  position="top"
                  scale={scale}
                />
                
                {/* Текстура перфорации на нижней черной полосе - на уровне всей ленты */}
                <LentaPerforationTexture 
                  width={totalWidth}
                  height={borderWidth}
                  position="bottom"
                  scale={scale}
                />
              </>
            )
          })()}
          
          {/* Кадры ленты */}
          {frames.map((frame, index) => {
            const isHovered = false // Временно отключено для производительности
            const frameWidth = 120 * scale
            const frameHeight = 80 * scale
            const borderWidth = 12 * scale // Высота черной полосы сверху/снизу
            const holeSize = 4 * scale // Размер дырочек
            const holeSpacing = 12 * scale // Расстояние между центрами дырочек
            
            return (
              <div
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onFrameClick) onFrameClick(lentaId, index, frames)
                }}
                onWheel={(e) => {
                  // Пробрасываем скролл событие родителю - не блокируем скролл
                  if (containerRef && containerRef.current) {
                    // Не вызываем preventDefault, чтобы скролл работал естественно
                    // Просто пробрасываем событие
                    const scrollEvent = new WheelEvent('wheel', {
                      deltaY: e.deltaY,
                      deltaX: e.deltaX,
                      bubbles: true,
                      cancelable: true
                    })
                    containerRef.current.dispatchEvent(scrollEvent)
                  }
                }}
                onTouchMove={(e) => {
                  // Для touch устройств тоже пробрасываем скролл
                  if (containerRef && containerRef.current) {
                    e.stopPropagation()
                  }
                }}
                style={{
                  width: `${frameWidth}px`,
                  height: `${frameHeight + borderWidth * 2}px`,
                  flexShrink: 0,
                  position: 'relative',
                  backgroundColor: '#000000', // Черный фон для полос сверху/снизу
                  // Тени убраны для оптимизации производительности
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer',
                  pointerEvents: 'auto', // Кадры кликабельны
                  touchAction: 'pan-y' // Разрешаем вертикальный скролл на touch устройствах
                }}
              >
                {/* Сам кадр в центре */}
                {frame.type === 'image' ? (
                    <Image
                      src={frame.src}
                      alt={`Frame ${index}`}
                      width={Math.round(frameWidth)}
                      height={Math.round(frameHeight)}
                      style={{
                        position: 'absolute',
                        top: `${borderWidth}px`,
                        left: 0,
                        width: '100%',
                        height: `${frameHeight}px`,
                        objectFit: 'cover',
                        borderRadius: '2px'
                      }}
                      priority={index < 2}
                      loading={index < 2 ? undefined : 'lazy'}
                      unoptimized
                      onError={(e) => {
                        e.target.style.display = 'none'
                        if (e.target.parentElement) {
                          e.target.parentElement.style.backgroundColor = '#333'
                        }
                      }}
                    />
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${borderWidth}px`,
                      left: 0,
                      width: '100%',
                      height: `${frameHeight}px`,
                      backgroundColor: frame.value || '#333',
                      borderRadius: '2px'
                    }}
                  />
                )}
              </div>
            )
          })}
        </motion.div>
      </motion.div>
            </div>
  )
}

// FPS-счётчик для замера производительности (временный, для бенчмарка)
function FPSCounter() {
  const ref = useRef(null)
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let rafId
    const loop = () => {
      frameCount++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - lastTime))
        if (ref.current) ref.current.textContent = fps + ' FPS'
        frameCount = 0
        lastTime = now
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])
  return (
    <div ref={ref} style={{
      position: 'fixed', top: 8, right: 8, zIndex: 99999,
      background: 'rgba(0,0,0,0.8)', color: '#0f0', padding: '4px 10px',
      fontFamily: 'monospace', fontSize: '14px', borderRadius: 4,
      pointerEvents: 'none'
    }}>-- FPS</div>
  )
}

export default function Home() {
  const containerRef = useRef(null)
  const firstScreenRef = useRef(null)
  const secondScreenRef = useRef(null)
  const thirdScreenRef = useRef(null)

  // Данные фильмографии из CSV (который получаем готовой конвертацией xlsx -> csv)
  const [filmographyData, setFilmographyData] = useState({ partners: [], projects: [] })
  
  // Встроенные base64 изображения для лент - загружены синхронно при импорте модуля
  // Все данные встроены в JS код страницы, никаких запросов к серверу
  const embeddedLentaImages = lentaImages || {}

  // Zustand store для управления эффектами
  const { isParallaxEnabled, toggleParallax, isGrainEnabled } = useParallaxStore()

  // Множитель разброса лент: на узких экранах ленты задвинуты дальше за края
  // 1.0 на десктопе (≥1200px) → 3.0 на мобильном (≤480px), плавная интерполяция
  const [lentaSpread, setLentaSpread] = useState(1)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1200) setLentaSpread(1)
      else if (w <= 480) setLentaSpread(3)
      else setLentaSpread(1 + 2 * (1200 - w) / (1200 - 480)) // линейная интерполяция 1→3
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  
  // Motion values для progress - без перерендеров
  const progressMotionValue = useMotionValue(0)

  // Ленты двигаются синхронно со скроллом — без spring-задержки
  // Разные "скорости" достигаются через параметр speed в каждой KinoLenta
  const springProgressFast = progressMotionValue
  const springProgressMedium = progressMotionValue
  const springProgressSlow = progressMotionValue
  const firstScreenProgressMotionValue = useMotionValue(0)
  const secondScreenProgressMotionValue = useMotionValue(0)
  const thirdScreenProgressMotionValue = useMotionValue(0)
  
  // Motion values для позиции мыши - без перерендеров
  const mouseX = useMotionValue(50) // 0-100, начальное значение центр
  const mouseY = useMotionValue(50) // 0-100, начальное значение центр
  
  // Motion value для кастомного скролла
  const customScrollTop = useMotionValue(0)
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false)
  const scrollbarRef = useRef(null)
  
  // Для отображения в UI (только для текста) - используем useState только для индикаторов
  const [progressText, setProgressText] = useState(0)
  const [firstScreenProgressText, setFirstScreenProgressText] = useState(0)
  
  // Состояние для тултипов SI - показываются одновременно
  const [showTooltips, setShowTooltips] = useState(false)
  
  // Функция для расчета возраста от даты рождения
  const calculateAge = (birthDate) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    // Если день рождения еще не прошел в этом году, уменьшаем возраст на 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }
  
  // Даты рождения: Саша - 24.04.2015, Игнат - 23.06.2021
  const sashaBirthDate = '2015-04-24'
  const ignatBirthDate = '2021-06-23'
  const [secondScreenProgressText, setSecondScreenProgressText] = useState(0)
  const [thirdScreenProgressText, setThirdScreenProgressText] = useState(0)
  const [flashActive, setFlashActive] = useState(false)
  const [clapperboardActive, setClapperboardActive] = useState(false) // Отключено по умолчанию для производительности
  const [clapperboardVisible, setClapperboardVisible] = useState(false) // Скрыто по умолчанию

  // Состояние для активной галереи
  const [activeGallery, setActiveGallery] = useState(null) // { lentaId, frameIndex, frames }
  
  // Состояние для выдвижной панели галереи
  const [showGallery, setShowGallery] = useState(false)

  // Ленивая загрузка лент для производительности
  const [showLents, setShowLents] = useState(false)

  // Постеры из TMDb API (загружаются из data/posters.json)
  const [postersMap, setPostersMap] = useState({})

  // Показываем ленты после полной загрузки страницы (оптимизация производительности)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLents(true)
    }, 1000) // Показываем ленты через 1 секунду после загрузки

    return () => clearTimeout(timer)
  }, [])

  // Фикс для нестабильных vh и vw единиц - устанавливаем CSS переменные
  useEffect(() => {
    const setViewportUnits = () => {
      const vh = window.innerHeight * 0.01
      const vw = window.innerWidth * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.documentElement.style.setProperty('--vw', `${vw}px`)
    }

    // Устанавливаем сразу
    setViewportUnits()

    // Обновляем при изменении размера окна и ориентации
    window.addEventListener('resize', setViewportUnits)
    window.addEventListener('orientationchange', setViewportUnits)

    return () => {
      window.removeEventListener('resize', setViewportUnits)
      window.removeEventListener('orientationchange', setViewportUnits)
    }
  }, [])

  // Отслеживание позиции мыши для параллакса - без перерендеров
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100 // 0-100
      const y = (e.clientY / window.innerHeight) * 100 // 0-100
      mouseX.set(x)
      mouseY.set(y)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  // Transforms для параллакса - преобразуем позицию мыши в значения перспективы
  // Для крупных лент (scale >= 1.5): сильный эффект
  const lentaLargeParallaxX = useTransform(mouseX, [0, 100], [-30, 30], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -30px до +30px
  const lentaLargeParallaxY = useTransform(mouseY, [0, 100], [-30, 30], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -30px до +30px
  const lentaLargeRotateX = useTransform(mouseY, [0, 100], [8, -8], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  const lentaLargeRotateY = useTransform(mouseX, [0, 100], [-8, 8], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы

  // Для средних лент (scale < 1.5): средний эффект
  const lentaMediumParallaxX = useTransform(mouseX, [0, 100], [-20, 20], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -20px до +20px
  const lentaMediumParallaxY = useTransform(mouseY, [0, 100], [-20, 20], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -20px до +20px
  const lentaMediumRotateX = useTransform(mouseY, [0, 100], [5, -5], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  const lentaMediumRotateY = useTransform(mouseX, [0, 100], [-5, 5], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы

  // Для маленьких лент: слабый эффект
  const lentaSmallParallaxX = useTransform(mouseX, [0, 100], [-15, 15], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -15px до +15px
  const lentaSmallParallaxY = useTransform(mouseY, [0, 100], [-15, 15], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -15px до +15px
  const lentaSmallRotateX = useTransform(mouseY, [0, 100], [3, -3], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  const lentaSmallRotateY = useTransform(mouseX, [0, 100], [-3, 3], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы

  // Для крупной круговой диаграммы в центре: СЛАБЫЙ эффект (она на переднем плане)
  const chartCenterParallaxX = useTransform(mouseX, [0, 100], [-5, 5], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -5px до +5px
  const chartCenterParallaxY = useTransform(mouseY, [0, 100], [-5, 5], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -5px до +5px
  const chartCenterRotateX = useTransform(mouseY, [0, 100], [1, -1], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  const chartCenterRotateY = useTransform(mouseX, [0, 100], [-1, 1], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы

  // Для маленьких диаграмм на заднем плане: СИЛЬНЫЙ эффект (они дальше)
  const chartBackParallaxX = useTransform(mouseX, [0, 100], [-25, 25], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -25px до +25px
  const chartBackParallaxY = useTransform(mouseY, [0, 100], [-25, 25], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -25px до +25px
  const chartBackRotateX = useTransform(mouseY, [0, 100], [6, -6], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  const chartBackRotateY = useTransform(mouseX, [0, 100], [-6, 6], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы

  // Комбинированные transforms для центрирования + параллакс
  const chartCenterX = useTransform(chartCenterParallaxX, (px) => `calc(-50% + ${px}px)`)
  const chartCenterY = useTransform(chartCenterParallaxY, (py) => `calc(-50% + ${py}px)`)
  const chartTopX = useTransform(chartBackParallaxX, (px) => `calc(-50% + ${px}px)`)
  const chartTopY = useTransform(chartBackParallaxY, (py) => `calc(2rem + ${py}px)`)
  const chartBottomX = useTransform(chartBackParallaxX, (px) => `calc(-50% + ${px}px)`)
  const chartBottomY = useTransform(chartBackParallaxY, (py) => `calc(-2rem + ${py}px)`)
  
  // Для помех на втором экране: комбинируем скролл и мышь
  // Параллакс от мыши для помех
  const grainMouseX = useTransform(mouseX, [0, 100], [-30, 30], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -30px до +30px
  const grainMouseY = useTransform(mouseY, [0, 100], [-30, 30], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -30px до +30px
  
  // Комбинированные motion values для backgroundPosition
  const grainBackgroundXValue = useMotionValue(0)
  const grainBackgroundYValue = useMotionValue(0)
  
  // Transform для backgroundPosition (комбинированная строка)
  const grainBackgroundPosition = useTransform(
    [grainBackgroundXValue, grainBackgroundYValue],
    ([x, y]) => `${x}px ${y}px`
  )
  
  // Transform для движения самого элемента (x, y) - комбинируем скролл и мышь
  const grainTransformXValue = useMotionValue(0)
  const grainTransformYValue = useMotionValue(0)
  
  const grainTransformX = grainTransformXValue
  const grainTransformY = grainTransformYValue
  
  // Перфорация теперь полностью на CSS-анимации, JS-логика удалена
  
  // Для карточек проектов: разная сила параллакса в зависимости от расстояния от центра
  // Центральная карточка (выбранная) - сильный параллакс
  const movieCardCenterParallaxX = useTransform(mouseX, [0, 100], [-15, 15], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -15px до +15px
  const movieCardCenterParallaxY = useTransform(mouseY, [0, 100], [-15, 15], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -15px до +15px
  const movieCardCenterRotateX = useTransform(mouseY, [0, 100], [3, -3], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  const movieCardCenterRotateY = useTransform(mouseX, [0, 100], [-3, 3], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  
  // Близкие карточки (offset 1) - средний параллакс
  const movieCardNearParallaxX = useTransform(mouseX, [0, 100], [-10, 10], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -10px до +10px
  const movieCardNearParallaxY = useTransform(mouseY, [0, 100], [-10, 10], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -10px до +10px
  const movieCardNearRotateX = useTransform(mouseY, [0, 100], [2, -2], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  const movieCardNearRotateY = useTransform(mouseX, [0, 100], [-2, 2], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы

  // Дальние карточки (offset 2) - слабый параллакс
  const movieCardFarParallaxX = useTransform(mouseX, [0, 100], [-5, 5], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -5px до +5px
  const movieCardFarParallaxY = useTransform(mouseY, [0, 100], [-5, 5], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // -5px до +5px
  const movieCardFarRotateX = useTransform(mouseY, [0, 100], [1, -1], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы
  const movieCardFarRotateY = useTransform(mouseX, [0, 100], [-1, 1], {
    output: (value) => isParallaxEnabled ? value : 0
  }) // градусы

  // Стабилизируем объект mouseParallaxValues через useMemo, чтобы не вызывать перерисовки MoviesCarousel
  const movieParallaxValues = useMemo(() => ({
    centerX: movieCardCenterParallaxX,
    centerY: movieCardCenterParallaxY,
    centerRotateX: movieCardCenterRotateX,
    centerRotateY: movieCardCenterRotateY,
    nearX: movieCardNearParallaxX,
    nearY: movieCardNearParallaxY,
    nearRotateX: movieCardNearRotateX,
    nearRotateY: movieCardNearRotateY,
    farX: movieCardFarParallaxX,
    farY: movieCardFarParallaxY,
    farRotateX: movieCardFarRotateX,
    farRotateY: movieCardFarRotateY
  }), [
    movieCardCenterParallaxX, movieCardCenterParallaxY, movieCardCenterRotateX, movieCardCenterRotateY,
    movieCardNearParallaxX, movieCardNearParallaxY, movieCardNearRotateX, movieCardNearRotateY,
    movieCardFarParallaxX, movieCardFarParallaxY, movieCardFarRotateX, movieCardFarRotateY
  ])

  // Загружаем постеры из Кинопоиска (public/data/posters.json)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/data/posters.json`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setPostersMap(data)
        }
      } catch (e) {
        // fallback: пустой объект (будет использоваться SVG)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Title aliases для отображения (Селфи -> Хейтер)
  const DISPLAY_ALIASES = {
    'Селфи': 'Хейтер'
  }

  // Fallback: генерим простой SVG постер, если внешний постер не найден/не загрузился
  const generatePosterSVG = useCallback((title, studio, period) => {
    const escapeXml = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const svgContent = `<svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="300" fill="#1a1a1a"/>
      <text x="100" y="140" font-family="Arial, sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">${escapeXml(title)}</text>
      <text x="100" y="160" font-family="Arial, sans-serif" font-size="11" fill="#888" text-anchor="middle">${escapeXml(studio)}</text>
      <text x="100" y="180" font-family="Arial, sans-serif" font-size="10" fill="#666" text-anchor="middle">${escapeXml(period)}</text>
    </svg>`
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent)
  }, [])

  // Получить постер для проекта (Кинопоиск или SVG fallback)
  const getPoster = useCallback((title) => {
    const posterData = postersMap[title]
    if (posterData && posterData.posterUrl) {
      return `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${posterData.posterUrl}`
    }
    return null // вернём null, чтобы использовать SVG fallback в компоненте
  }, [postersMap])

  // Загружаем CSV и преобразуем в projects/partners.
  // CSV берётся из public/data/filmography.csv, который генерится готовым конвертером (xlsx -> csv).
  useEffect(() => {
    let cancelled = false

    const normalize = (s) => (s || '').toString().trim()

    const hasHeader = (row) => {
      const r = row.map((v) => normalize(v).toLowerCase())
      const hasPeriod = r.some((c) => c.includes('период'))
      const hasStudio = r.some((c) => c.includes('студ'))
      const hasProject = r.some((c) => c.includes('проект'))
      const hasFormat = r.some((c) => c.includes('формат'))
      return hasPeriod && hasStudio && hasProject && hasFormat
    }

    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/data/filmography.csv`, { cache: 'no-store' })
        const text = await res.text()
        const parsed = Papa.parse(text, { skipEmptyLines: false })
        const rows = Array.isArray(parsed.data) ? parsed.data : []

        // find header row
        let headerIdx = -1
        for (let i = 0; i < Math.min(40, rows.length); i++) {
          const row = Array.isArray(rows[i]) ? rows[i] : []
          if (hasHeader(row)) {
            headerIdx = i
            break
          }
        }
        if (headerIdx === -1) throw new Error('Header row not found in filmography.csv')

        const header = rows[headerIdx].map((v) => normalize(v))
        const idx = (name) => header.findIndex((h) => h.toLowerCase().includes(name))
        const periodI = idx('период')
        const studioI = idx('студ')
        const projectI = idx('проект')
        const formatI = idx('формат')

        let lastPeriod = ''
        let lastStudio = ''
        let lastFormat = ''

        const projects = []
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = Array.isArray(rows[i]) ? rows[i] : []
          const period = normalize(row[periodI])
          const studio = normalize(row[studioI])
          const title = normalize(row[projectI])
          const format = normalize(row[formatI])

          if (period) lastPeriod = period
          if (studio) lastStudio = studio
          if (format) lastFormat = format

          if (!title) continue
          if (!lastStudio) continue

          projects.push({
            title,
            period: lastPeriod,
            studio: lastStudio,
            format: lastFormat
          })
        }

        const partners = Array.from(new Set(projects.map((p) => p.studio).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'ru'))
          .map((name) => ({ name }))

        if (!cancelled) setFilmographyData({ partners, projects })
      } catch (e) {
        // fallback: keep empty (будет использоваться fallback ниже)
        if (!cancelled) setFilmographyData({ partners: [], projects: [] })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Партнеры из CSV (с fallback на 6 значений)
  const partners = useMemo(() => {
    let processedPartners = []
    
    if (filmographyData.partners && filmographyData.partners.length > 0) {
      processedPartners = [...filmographyData.partners]
    } else {
      processedPartners = [
        { name: 'Мосфильм' },
        { name: 'Ленфильм' },
        { name: 'СТВ' },
        { name: 'Централ Партнершип' },
        { name: 'ВГТРК' },
        { name: 'Первый канал' }
      ]
    }
    
    // Партнеры уже разделены в CSV, просто возвращаем их
    return processedPartners
  }, [filmographyData.partners])

  // Проекты из CSV -> формат для MoviesCarousel
  // Все проекты отображаются в галерее, даже без постеров (используется SVG fallback)
  const topMovies = useMemo(() => {
    if (filmographyData.projects && filmographyData.projects.length > 0) {
      // Переставляем проекты в обратном порядке
      return filmographyData.projects.slice().reverse().map((p) => {
        // Используем alias для отображения (Селфи -> Хейтер)
        const displayTitle = DISPLAY_ALIASES[p.title] || p.title
        // Пытаемся найти постер из Кинопоиска
        const posterUrl = getPoster(p.title)
        // Если постер не найден, используем SVG placeholder
        return {
          title: displayTitle,
          poster: posterUrl || generatePosterSVG(displayTitle, p.studio, p.period),
          kinopoiskId: null,
          studio: p.studio,
          period: p.period,
          format: p.format
        }
      })
    }
    return []
  }, [filmographyData.projects, postersMap, getPoster, generatePosterSVG])
  
  // Генерация frames для ленты на основе lentaId (для стабильности)
  const generateFramesForLenta = (lentaId, frameCount) => {
    // Используем lentaId как seed для генерации стабильных цветов
    const seed = lentaId.split('-')[1] // Извлекаем номер из "lenta-1" -> "1"
    const seedNum = parseInt(seed) || 0
    
    return Array.from({ length: frameCount }, (_, i) => {
      // Простая детерминированная генерация на основе seed и индекса
      const r = (seedNum * 17 + i * 23) % 256
      const g = (seedNum * 31 + i * 37) % 256
      const b = (seedNum * 41 + i * 43) % 256
      return `rgb(${r}, ${g}, ${b})`
    })
  }

  // Массив всех лент с их данными - используем folderId для генерации путей к изображениям
  // Количество файлов будет определено динамически при загрузке
  const allLentas = useMemo(() => {
    return [
      { id: 'lenta-1', folderId: '1' },
      { id: 'lenta-6', folderId: '2' },
      { id: 'lenta-9', folderId: '3' },
      { id: 'lenta-2', folderId: '4' },
      { id: 'lenta-3', folderId: '5' },
      { id: 'lenta-4', folderId: '6' },
      { id: 'lenta-7', folderId: '7' },
      { id: 'lenta-8', folderId: '8' },
      { id: 'lenta-12', folderId: '9' },
      { id: 'lenta-5', folderId: '10' },
      { id: 'lenta-10', folderId: '11' },
      { id: 'lenta-11', folderId: '12' }
    ]
  }, [])

  const handleFrameClick = (lentaId, frameIndex, frames) => {
    // Находим индекс ленты в массиве
    const lentaIndex = allLentas.findIndex(l => l.id === lentaId)
    
    // Используем переданные frames (они уже содержат реальные изображения)
    // allLentas будет обновлен в Gallery при загрузке
    setActiveGallery({ 
      lentaId, 
      frameIndex, 
      frames, // Передаем реальные frames с изображениями
      lentaIndex: lentaIndex >= 0 ? lentaIndex : 0,
      allLentas // Передаем allLentas для навигации между лентами
    })
  }
  
  const handleCloseGallery = () => {
    setActiveGallery(null)
  }
  
  const handleSign = () => {
    setFlashActive(true)
  }
  
  const handleFlashComplete = () => {
    setFlashActive(false)
  }
  
  // Показываем хлопушку на 1/3 времени всех вспышек раньше (~1 сек)
  // Без автозакрытия - окно остается открытым до ручного закрытия
  // Но верхняя створка закрывается после падения
  useEffect(() => {
    if (flashActive) {
      // Показываем на 1 сек (на 1/3 времени всех вспышек раньше)
      const showTimeout = setTimeout(() => {
        setClapperboardActive(true) // Открыта
        setClapperboardVisible(true) // Показываем и падает сверху
      }, 1000) // 1 сек - на 1/3 времени всех вспышек раньше
      
      // Закрываем верхнюю створку после падения (через ~1.5 сек после начала падения)
      // 1000ms (показ) + 1500ms (время падения) = 2500ms
      const closeFlapTimeout = setTimeout(() => {
        setClapperboardActive(false) // Закрываем верхнюю створку
      }, 2500)
      
      return () => {
        clearTimeout(showTimeout)
        clearTimeout(closeFlapTimeout)
      }
    }
    // Убираем else блок - окно остается видимым до ручного закрытия
  }, [flashActive])
  
  const handleClapperboardClose = useCallback(() => {
    setClapperboardActive(false)
    setTimeout(() => {
      setClapperboardVisible(false)
    }, 600) // Время на анимацию закрытия
  }, [])

  // Отслеживаем скролл контейнера с помощью framer-motion
  const { scrollYProgress, scrollY } = useScroll({
    container: containerRef,
    layoutEffect: false
  })

  // Отслеживаем прогресс каждого экрана от появления до исчезновения
  // offset: ["start end"] - когда верхний край экрана касается нижней части viewport (0%)
  // offset: ["end start"] - когда нижний край экрана касается верхней части viewport (100%)
  const { scrollYProgress: firstScreenScrollProgress } = useScroll({
    container: containerRef,
    target: firstScreenRef,
    offset: ["start end", "end start"],
    layoutEffect: false
  })

  const { scrollYProgress: secondScreenScrollProgress } = useScroll({
    container: containerRef,
    target: secondScreenRef,
    offset: ["start end", "end start"],
    layoutEffect: false
  })

  const { scrollYProgress: thirdScreenScrollProgress } = useScroll({
    container: containerRef,
    target: thirdScreenRef,
    offset: ["start end", "end start"],
    layoutEffect: false
  })

  // Вычисляем прогресс через useTransform - без перерендеров, прямое обновление DOM
  // Используем useTransform для преобразования scrollY в progress (0-1)
  useEffect(() => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const updateProgress = () => {
      const viewportHeight = container.clientHeight
      const containerHeight = container.scrollHeight
      const full = containerHeight - viewportHeight
      
      if (full <= 0) {
        progressMotionValue.set(0)
        return
      }
      
      // Подписываемся на изменения scrollY и обновляем progressMotionValue
      const unsubscribe = scrollY.on("change", (latest) => {
        const progressValue = Math.min(Math.max((latest / full) * 100, 0), 100) / 100
        progressMotionValue.set(progressValue)
      })
      
      return unsubscribe
    }
    
    const unsubscribe = updateProgress()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [scrollY, progressMotionValue])
  
  // Преобразуем scrollYProgress в motion value напрямую
  useEffect(() => {
    const unsubscribe1 = firstScreenScrollProgress.on("change", (latest) => {
      firstScreenProgressMotionValue.set(latest)
    })
    const unsubscribe2 = secondScreenScrollProgress.on("change", (latest) => {
      secondScreenProgressMotionValue.set(latest)
    })
    const unsubscribe3 = thirdScreenScrollProgress.on("change", (latest) => {
      thirdScreenProgressMotionValue.set(latest)
    })
    
    return () => {
      unsubscribe1()
      unsubscribe2()
      unsubscribe3()
    }
  }, [firstScreenScrollProgress, secondScreenScrollProgress, thirdScreenScrollProgress, firstScreenProgressMotionValue, secondScreenProgressMotionValue, thirdScreenProgressMotionValue])
  
  // Motion values для изменения параметров шума (не движения, а изменения свойств)
  const grainNoiseIntensity = useMotionValue(0.5) // Интенсивность шума
  const grainNoiseOpacity = useMotionValue(0.6) // Прозрачность шума
  
  // Обновляем параметры шума при изменении скролла или мыши (не движение, а изменение)
  useEffect(() => {
    const updateNoise = () => {
      const scroll = secondScreenScrollProgress.get()
      const mouseXVal = mouseX.get() / 100 // 0-1
      const mouseYVal = mouseY.get() / 100 // 0-1

      // Изменяем backgroundPosition на основе скролла и мыши (движение фона)
      if (isParallaxEnabled) {
        grainBackgroundXValue.set(scroll * 200 + (mouseXVal - 0.5) * 50)
        grainBackgroundYValue.set(scroll * 200 + (mouseYVal - 0.5) * 50)
      } else {
        grainBackgroundXValue.set(scroll * 200) // Только скролл, без мыши
        grainBackgroundYValue.set(scroll * 200)
      }

      // Изменяем интенсивность шума на основе мыши и скролла (не движение, а изменение)
      const mouseInfluence = isParallaxEnabled ? (mouseXVal + mouseYVal) * 0.1 : 0
      const noiseIntensity = 0.4 + scroll * 0.3 + mouseInfluence
      grainNoiseIntensity.set(Math.min(1, Math.max(0.3, noiseIntensity)))

      const mouseOpacityInfluence = isParallaxEnabled ? (mouseXVal + mouseYVal) * 0.15 : 0
      const noiseOpacity = 0.5 + scroll * 0.2 + mouseOpacityInfluence
      grainNoiseOpacity.set(Math.min(1, Math.max(0.3, noiseOpacity)))
    }
    
    const unsubscribeScroll = secondScreenScrollProgress.on('change', updateNoise)
    const unsubscribeMouseX = mouseX.on('change', updateNoise)
    const unsubscribeMouseY = mouseY.on('change', updateNoise)
    
    // Инициализация
    updateNoise()
    
    return () => {
      unsubscribeScroll()
      unsubscribeMouseX()
      unsubscribeMouseY()
    }
  }, [secondScreenScrollProgress, mouseX, mouseY, grainBackgroundXValue, grainBackgroundYValue, grainNoiseIntensity, grainNoiseOpacity])
  
  // Motion values для перерисовки царапин (изменение их позиций)
  const scratchRedrawTrigger = useMotionValue(0) // Триггер для перерисовки
  
  useEffect(() => {
    const updateScratches = () => {
      // Просто обновляем триггер, чтобы вызвать перерисовку
      scratchRedrawTrigger.set(Date.now())
    }

    const unsubscribeScroll = secondScreenScrollProgress.on('change', updateScratches)
    const unsubscribeMouseX = isParallaxEnabled ? mouseX.on('change', updateScratches) : null
    const unsubscribeMouseY = isParallaxEnabled ? mouseY.on('change', updateScratches) : null

    return () => {
      unsubscribeScroll()
      if (unsubscribeMouseX) unsubscribeMouseX()
      if (unsubscribeMouseY) unsubscribeMouseY()
    }
  }, [secondScreenScrollProgress, mouseX, mouseY, scratchRedrawTrigger, isParallaxEnabled])
  
  // UI обновления - синхронные для плавной работы (дебаунсинг только для тяжелых диаграмм)
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    setProgressText(Math.round(latest * 100))
  })
  useMotionValueEvent(firstScreenProgressMotionValue, "change", (latest) => {
    setFirstScreenProgressText(Math.round(latest * 100))
  })
  useMotionValueEvent(secondScreenProgressMotionValue, "change", (latest) => {
    setSecondScreenProgressText(Math.round(latest * 100))
  })
  useMotionValueEvent(thirdScreenProgressMotionValue, "change", (latest) => {
    setThirdScreenProgressText(Math.round(latest * 100))
  })

  return (
    <>
      {/* FPS-счётчик (временный бенчмарк) */}
      <FPSCounter />
      {/* Компонент Вспышка */}
      <Flash isActive={flashActive} onComplete={handleFlashComplete} />
      
      {/* Выдвижная галерея локаций */}
      {showGallery && (
        <Gallery
          onClose={() => setShowGallery(false)}
          lentaIndex={0}
          allLentas={allLentas}
          embeddedImages={embeddedLentaImages}
        />
      )}
      
      {/* Логотип SI-PRODUCTION в правом нижнем углу */}
      <div 
        className="si-production-logo"
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          color: '#ffffff',
          fontSize: 'clamp(32px, 6vw, 72px)',
          fontFamily: "'Science Gothic', monospace",
          fontWeight: 'bold',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {/* Контейнер для SI с обработчиками событий */}
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => setShowTooltips(true)}
          onMouseLeave={() => setShowTooltips(false)}
          onClick={() => setShowTooltips(!showTooltips)}
        >
          {/* Буква S */}
          <span 
            style={{
              fontFamily: "'Slovic', sans-serif",
              color: '#ff0000',
              transform: 'translateY(-3px)'
            }}
          >
            S
          </span>
          
          {/* Буква I */}
          <span 
            style={{
              fontFamily: "'Slovic', sans-serif",
              color: '#ff0000',
              transform: 'translateY(-3px)'
            }}
          >
            I
          </span>
          
          {/* Центральная точка отсчета для позиционирования тултипа */}
          {showTooltips && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '0px',
                height: '0px',
                pointerEvents: 'none'
              }}
            >
              {/* Общий тултип над SI, разделенный вертикальной чертой */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: '50%',
                  padding: '8px 0',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  borderRadius: '6px',
                  fontSize: 'clamp(14px, 1.5vw, 18px)',
                  fontFamily: "'Slovic', sans-serif",
                  pointerEvents: 'none',
                  zIndex: 10001,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'stretch',
                  whiteSpace: 'nowrap',
                  transform: 'translateX(-50%)'
                }}
              >
                {/* Левая часть - Саша */}
                <div style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  borderRight: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <div style={{ color: '#ffffff' }}>Саша</div>
                  <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '2px', color: '#ffffff' }}>
                    {calculateAge(sashaBirthDate)} годиков
                  </div>
                </div>
                
                {/* Правая часть - Игнат */}
                <div style={{
                  padding: '8px 12px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#ffffff' }}>Игнат</div>
                  <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '2px', color: '#ffffff' }}>
                    {calculateAge(ignatBirthDate)} годиков
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </span>
        
        <span className="dash-text" style={{ pointerEvents: 'none' }}>-</span>
        <span 
          className="production-text"
          style={{
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)',
            pointerEvents: 'none'
          }}
        >PRODUCTION</span>
      </div>
      
      {/* Контейнер для хлопушки - fixed с overflow hidden */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: clapperboardVisible ? 'auto' : 'none',
        overflow: 'hidden',
        zIndex: 99999, // Ниже вспышки (100000)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px', // Для 3D эффекта хлопающей створки
        cursor: 'pointer'
      }}
      onClick={handleClapperboardClose}>
        <Clapperboard isActive={clapperboardActive} isVisible={clapperboardVisible} onClose={handleClapperboardClose} />
            </div>

      {/* Яркие звезды снаружи уменьшаемой страницы */}
      <BrightStarrySky starCount={100} isVisible={clapperboardVisible} />

      {/* Голубое свечение вокруг уменьшающейся скроллящейся зоны */}
      {clapperboardVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 1, // Выше звезд, но ниже счелкунчика
            transform: 'translate(-50%, -50%)',
            // Многократно ярче - голубое свечение вокруг уменьшающейся страницы
            background: `
              radial-gradient(ellipse 80vw 80vh at center, 
                rgba(135, 206, 250, 0.8) 0%, 
                rgba(100, 180, 255, 0.6) 20%, 
                rgba(70, 130, 220, 0.4) 40%, 
                rgba(26, 26, 62, 0.3) 60%, 
                rgba(10, 10, 46, 0.2) 80%, 
                transparent 100%
              )
            `,
            mixBlendMode: 'screen',
            filter: 'blur(60px)',
            opacity: 0.9
          }}
        />
      )}

    {/* Wrapper для трансформаций - не мешает скроллу */}
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // Не блокирует события скролла
        zIndex: 0,
        transformOrigin: 'center center'
      }}
      animate={{
        scale: clapperboardVisible ? 0.8 : 1,
        y: clapperboardVisible ? '-50vh' : 0
      }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <div 
        ref={containerRef} 
        className="main-scroll-container"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: clapperboardVisible ? '200vh' : '100vh',
          overflowY: 'auto', // Нативный скролл
          overflowX: 'hidden',
          touchAction: 'pan-y', // Разрешаем вертикальный touch-скролл на мобильных
          pointerEvents: 'auto', // Явно разрешаем события для скролла
          transition: 'height 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)' // Плавный переход для height
        }}
      >
      {/* Ленты — sticky контейнер, прилипает к viewport при скролле */}
      {/* СТАРЫЕ ЛЕНТЫ ЗАКОММЕНТИРОВАНЫ - теперь используем BottomPhotoStrip и GalleryLink
      <div style={{
        position: 'sticky',
        top: 0,
        left: 0,
        width: '100vw',
        height: 0,
        pointerEvents: 'none',
        zIndex: 900,
        overflow: 'visible'
      }}>
        <KinoLenta lentaId="lenta-1" folderId="1" progress={springProgressFast} center={0.6 * 0.6 / 3} topOffset={0} speed={1.0} angle={15} scale={2} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-6" folderId="2" progress={springProgressFast} center={0.35 * 0.6 / 3} topOffset={-40} speed={1.3} angle={10} scale={1.8} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-9" folderId="3" progress={springProgressFast} center={0.55 * 0.6 / 3} topOffset={-15} speed={1.4} angle={-12} inverse={true} scale={1.6} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-2" folderId="4" progress={springProgressMedium} center={0.9 * 0.6 / 3} topOffset={25} speed={1.0} angle={-15} inverse={true} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-3" folderId="5" progress={springProgressMedium} center={0.3 * 0.6 / 3} topOffset={-45} speed={1.5} angle={20} scale={1.5} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-4" folderId="6" progress={springProgressMedium} center={0.4 * 0.6 / 3} topOffset={-35} speed={1.2} angle={15} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-7" folderId="7" progress={springProgressMedium} center={0.65 * 0.6 / 3} topOffset={-25} speed={0.9} angle={-18} inverse={true} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-8" folderId="8" progress={springProgressMedium} center={0.45 * 0.6 / 3} topOffset={-20} speed={1.1} angle={22} scale={1.3} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-12" folderId="9" progress={springProgressMedium} center={0.8 * 0.6 / 3} topOffset={30} speed={0.8} angle={18} scale={1.6} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-5" folderId="10" progress={springProgressSlow} center={0.5 * 0.6 / 3} topOffset={-30} speed={0.7} angle={-25} inverse={true} scale={1.2} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-10" folderId="11" progress={springProgressSlow} center={0.7 * 0.6 / 3} topOffset={-10} speed={0.8} angle={-15} inverse={true} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} embeddedImages={embeddedLentaImages} />
        <KinoLenta lentaId="lenta-11" folderId="12" progress={springProgressSlow} center={0.75 * 0.6 / 3} topOffset={10} speed={1.2} angle={-12} inverse={true} scale={1.4} spreadMultiplier={lentaSpread} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} embeddedImages={embeddedLentaImages} />
      </div>
      КОНЕЦ ЗАКОММЕНТИРОВАННЫХ СТАРЫХ ЛЕНТ */}
      
      {/* Индикатор прогресса в левом верхнем углу */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        color: '#ffffff',
        fontSize: 'clamp(14px, 2vw, 18px)',
        fontFamily: "'Science Gothic', monospace",
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '8px 16px',
        borderRadius: '4px',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none'
      }}>
        Прогресс кинопроизводства: {progressText}%
            </div>

      {/* Первый экран */}
      <section
        ref={firstScreenRef}
        style={{
          width: '100vw',
          height: 'calc(var(--vh, 1vh) * 100)',
          backgroundColor: '#0a0a0a',
          position: 'relative',
          overflow: 'clip',
          overflowX: 'clip'
        }}
      >
        {/* Видео фон — sticky: следует за viewport пока section видна */}
        <div style={{
          position: 'sticky',
          top: 0,
          left: 0,
          width: '100vw',
          height: 'calc(var(--vh, 1vh) * 100)',
          zIndex: 0,
          overflow: 'hidden'
        }}>
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'cover'
            }}
          >
            <source src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/video_background.webm`} type="video/webm" />
            <source src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/video_2026-02-04_19-56-39.mp4`} type="video/mp4" />
          </video>
        </div>
        {/* Индикатор прогресса первого экрана */}
        <div style={{
          position: 'sticky',
          top: '70px',
          width: 'fit-content',
          left: '16px',
          color: '#ffffff',
          fontSize: 'clamp(14px, 2vw, 18px)',
          fontFamily: "'Science Gothic', monospace",
          zIndex: 10000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 16px',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none'
        }}>
          Составление плана: {firstScreenProgressText}%
            </div>
        
        {/* Нижняя лента фотографий */}
        {showLents && (
          <BottomPhotoStrip
            allLentas={allLentas}
            embeddedImages={embeddedLentaImages}
            onPhotoClick={() => setShowGallery(true)}
            firstScreenProgress={firstScreenProgressMotionValue}
          />
        )}
        
        {/* Ссылка на галерею локаций */}
        {showLents && (
          <GalleryLink
            onClick={() => setShowGallery(true)}
            firstScreenProgress={firstScreenProgressMotionValue.get()}
          />
        )}
      </section>

      {/* Второй экран */}
      <section 
        ref={secondScreenRef}
        style={{ 
        width: '100vw', 
          height: 'calc(var(--vh, 1vh) * 100)', 
          backgroundColor: '#0a0a0a',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          overflowX: 'hidden'
        }}
      >
        {/* Индикатор прогресса второго экрана - обертка для правильной работы sticky */}
        <ProgressIndicator progressText={secondScreenProgressText} />
        
        {/* Эффект ТВ-шума — статическая PNG-текстура с CSS-анимацией */}
        {isGrainEnabled && (
          <div
            style={{
              position: 'absolute',
              top: '-128px',
              left: '-128px',
              width: 'calc(100% + 256px)',
              height: 'calc(100% + 256px)',
              pointerEvents: 'none',
              zIndex: 100,
              opacity: 0.15,
              backgroundImage: `url(${process.env.NEXT_PUBLIC_BASE_PATH || ''}/noise.png)`,
              backgroundSize: '128px 128px',
              backgroundRepeat: 'repeat',
              animation: 'tvNoise 0.3s steps(4) infinite',
            }}
          />
        )}

        {/* Движущиеся ленты перфорации по границам экрана */}
        <PerforatedBorderTexture position="top" />
        <PerforatedBorderTexture position="bottom" />
        
        {/* Линейная диаграмма на весь экран */}
        <LineChartComponent key="line-chart-main" progressMotionValue={secondScreenScrollProgress} />
        
        {/* Радарная диаграмма - сверху с отступом, задний план, СИЛЬНЫЙ параллакс */}
        <ChartContainer
          style={{
            top: '2rem',
            x: chartTopX,
            y: chartTopY,
            rotateX: chartBackRotateX,
            rotateY: chartBackRotateY,
          }}
        >
          <RadarChartComponent key="radar-chart-main" progressMotionValue={secondScreenScrollProgress} />
        </ChartContainer>
        
        {/* Радиальная столбчатая диаграмма - снизу с отступом, задний план, СИЛЬНЫЙ параллакс */}
        <ChartContainer
          style={{
            bottom: '2rem',
            top: 'auto',
            x: chartBottomX,
            y: chartBottomY,
            rotateX: chartBackRotateX,
            rotateY: chartBackRotateY,
          }}
        >
          <RadialBarChartComponent key="radial-bar-chart-main" progressMotionValue={secondScreenScrollProgress} />
        </ChartContainer>

        {/* Круговая диаграмма прогресса - по центру, передний план, СЛАБЫЙ параллакс */}
        <CenterChartContainer
          style={{
            x: chartCenterX,
            y: chartCenterY,
            rotateX: chartCenterRotateX,
            rotateY: chartCenterRotateY,
          }}
        >
          <ProgressChart key="progress-chart-main" progressMotionValue={secondScreenScrollProgress} />
        </CenterChartContainer>
        
          {/* Контейнер для договора */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(210mm, 90vw)',
            height: 'min(297mm, calc(90vw * 1.414))',
            maxHeight: 'calc(var(--vh, 1vh) * 90)',
            zIndex: 20
          }}>
            {/* Сетчатый лист A4 - фон с сеткой */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backgroundImage: `
                linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
              `,
              backgroundSize: '1.5em 1.5em',
              backgroundPosition: 'center center',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 4px 16px rgba(0, 0, 0, 0.6)'
            }} />

            {/* Контейнер с текстом договора */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                padding: 'clamp(16px, 3vw, 2rem)',
                display: 'flex',
                flexDirection: 'column',
                fontSize: 'clamp(24px, 3vw, 36px)',
                pointerEvents: 'auto',
                zIndex: 1
              }}
            >
            {/* Надпись ДОГОВОР сверху по центру */}
            <div style={{
              textAlign: 'center',
              marginBottom: 'auto',
              paddingTop: '1em'
            }}>
              <h1 
                style={{
                  fontSize: '2em',
                  fontFamily: "'Slovic', sans-serif",
                  color: '#ffffff',
                  margin: 0
                }}
              >
                ДОГОВОР
              </h1>
            </div>

            {/* Список услуг с галочками в центре */}
            <ContractItemsList progressMotionValue={secondScreenProgressMotionValue} />

            {/* Кнопка Подписать снизу */}
            <div style={{
              textAlign: 'center',
              marginTop: 'auto',
              paddingBottom: '1em'
            }}>
              <button 
                onClick={handleSign}
                style={{
                  padding: '0.6em 1.6em',
                  backgroundColor: '#ff0000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.2em',
                  fontSize: '1em',
                  fontFamily: "'Slovic', sans-serif",
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff'
                  e.currentTarget.style.color = '#ff0000'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff0000'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff'
                  e.currentTarget.style.color = '#ff0000'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff'
                  e.currentTarget.style.color = '#ff0000'
                }}
              >
                Подписать
              </button>
            </div>
          </div>
          </div>
        
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffffff',
          fontSize: 'clamp(24px, 5vw, 48px)',
          fontFamily: "'Slovic', sans-serif",
          textAlign: 'center',
          zIndex: -1,
          pointerEvents: 'none'
        }}>
          Второй экран
        </div>
      </section>

      {/* Третий экран */}
      <section 
        ref={thirdScreenRef}
        style={{
        width: '100vw',
          minHeight: 'calc(var(--vh, 1vh) * 100)',
          background: 'linear-gradient(to bottom, #000000 0%, #0a0a2e 50%, #1a1a3e 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Упрощенное звездное небо для производительности */}
        <StarrySky starCount={50} />

        {/* Индикатор прогресса третьего экрана */}
        <div style={{
          position: 'sticky',
          top: '16px',
          width: 'fit-content',
          marginLeft: 'auto',
          marginRight: '16px',
          color: '#ffffff',
          fontSize: 'clamp(14px, 2vw, 18px)',
          fontFamily: "'Science Gothic', monospace",
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 16px',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none'
        }}>
          Монтаж: {thirdScreenProgressText}%
        </div>

        {/* Секция НАША ФИЛЬМОГРАФИЯ */}
        <div style={{
          width: '90%',
          margin: '0 auto',
          paddingTop: '4rem',
          paddingBottom: '4rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
          position: 'relative'
        }}>
          {/* Заголовок НАША ФИЛЬМОГРАФИЯ */}
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            <h1 
              style={{
                fontSize: 'clamp(2em, 5vw, 4em)',
                fontFamily: "'Slovic', sans-serif",
                color: '#ffffff',
                margin: 0,
                lineHeight: '0.9'
              }}
            >
              НАША ФИЛЬМОГРАФИЯ
            </h1>
          </div>

          {/* Карусель с фильмами */}
          <div style={{ minHeight: '500px', position: 'relative', zIndex: 21 }}>
            <MoviesCarousel 
              movies={topMovies}
              mouseParallaxValues={movieParallaxValues}
            />
          </div>

          {/* Блок с рекламными компаниями */}
          <div style={{
            marginTop: '4rem',
            padding: '2rem',
            textAlign: 'center',
            position: 'relative',
            zIndex: 22
          }}>
            <h3 style={{
              color: '#ffffff',
              fontFamily: "'Slovic', sans-serif",
              fontSize: 'clamp(1.2em, 2.5vw, 1.8em)',
              marginBottom: '2rem',
              opacity: 0.9
            }}>
              Участвовали в съемке рекламы для:
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '1rem',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {/* Одноклассники */}
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 140, 0, 0.5)',
                color: 'rgba(255, 140, 0, 0.7)',
                fontFamily: "'Slovic', sans-serif",
                fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)',
                fontWeight: 'normal',
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 140, 0, 0.8)'
                e.currentTarget.style.color = 'rgba(255, 140, 0, 0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 140, 0, 0.5)'
                e.currentTarget.style.color = 'rgba(255, 140, 0, 0.7)'
              }}
              >
                Одноклассники
              </div>

              {/* ВТБ */}
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(0, 57, 166, 0.5)',
                color: 'rgba(0, 57, 166, 0.7)',
                fontFamily: "'Slovic', sans-serif",
                fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)',
                fontWeight: 'normal',
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 57, 166, 0.8)'
                e.currentTarget.style.color = 'rgba(0, 57, 166, 0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 57, 166, 0.5)'
                e.currentTarget.style.color = 'rgba(0, 57, 166, 0.7)'
              }}
              >
                ВТБ
              </div>

              {/* Авито */}
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 107, 53, 0.5)',
                color: 'rgba(255, 107, 53, 0.7)',
                fontFamily: "'Slovic', sans-serif",
                fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)',
                fontWeight: 'normal',
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.8)'
                e.currentTarget.style.color = 'rgba(255, 107, 53, 0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.5)'
                e.currentTarget.style.color = 'rgba(255, 107, 53, 0.7)'
              }}
              >
                Авито
              </div>

              {/* Аурус */}
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(212, 175, 55, 0.5)',
                color: 'rgba(212, 175, 55, 0.7)',
                fontFamily: "'Slovic', sans-serif",
                fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)',
                fontWeight: 'normal',
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.8)'
                e.currentTarget.style.color = 'rgba(212, 175, 55, 0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)'
                e.currentTarget.style.color = 'rgba(212, 175, 55, 0.7)'
              }}
              >
                Аурус
              </div>
            </div>
          </div>

          {/* Титры с названиями проектов на заднем плане - бесконечная прокрутка */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            width: '100%',
            pointerEvents: 'none',
            height: '500px',
            overflow: 'hidden',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 1) 15%, rgba(0, 0, 0, 1) 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 1) 15%, rgba(0, 0, 0, 1) 85%, transparent 100%)'
          }}>
            <div style={{
              display: 'flex',
              gap: '3rem',
              maxWidth: '800px',
              margin: '0 auto',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Первый столбец - прокрутка снизу вверх */}
              <div style={{
                flex: 1,
                height: '100%',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <motion.div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                  initial={{ y: '0%' }}
                  animate={{
                    y: '-33.333%'
                  }}
                  transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                >
                  {/* Дублируем список 3 раза для бесшовной прокрутки */}
                  {[...Array(3)].map((_, repeatIndex) => (
                    <React.Fragment key={`repeat-${repeatIndex}`}>
                      {topMovies.filter((_, index) => index % 2 === 0).map((movie, index) => (
                        <div
                          key={`col1-${repeatIndex}-${index}`}
                          style={{
                            textAlign: 'center',
                            color: '#ffffff',
                            fontSize: 'clamp(0.7rem, 1.2vw, 1rem)',
                            fontFamily: "'Slovic', sans-serif",
                            opacity: 0.6,
                            lineHeight: '1.8',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {movie.title}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </motion.div>
              </div>
              {/* Второй столбец - прокрутка сверху вниз */}
              <div style={{
                flex: 1,
                height: '100%',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <motion.div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                  initial={{ y: '-33.333%' }}
                  animate={{
                    y: '0%'
                  }}
                  transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                >
                  {/* Дублируем список 3 раза для бесшовной прокрутки */}
                  {[...Array(3)].map((_, repeatIndex) => (
                    <React.Fragment key={`repeat-${repeatIndex}`}>
                      {topMovies.filter((_, index) => index % 2 === 1).map((movie, index) => (
                        <div
                          key={`col2-${repeatIndex}-${index}`}
                          style={{
                            textAlign: 'center',
                            color: '#ffffff',
                            fontSize: 'clamp(0.7rem, 1.2vw, 1rem)',
                            fontFamily: "'Slovic', sans-serif",
                            opacity: 0.6,
                            lineHeight: '1.8',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {movie.title}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Секция СОТРУДНИЧЕСТВА */}
        <div style={{
          width: '90%',
          margin: '0 auto',
          paddingTop: '4rem',
          paddingBottom: '4rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
          position: 'relative'
        }}>
          {/* Заголовок СОТРУДНИЧЕСТВА */}
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            <h1
              style={{
                fontSize: 'clamp(1.2em, 3vw, 2.5em)',
                fontFamily: "'Slovic', sans-serif",
                color: '#ffffff',
                margin: 0,
                lineHeight: '1.4'
              }}
            >
              <span style={{ opacity: 0.7 }}>В разное время мы{'\u00A0\u00A0'}</span>
              <span style={{ opacity: 1, fontSize: '1.2em', fontWeight: 'bold' }}>СОТРУДНИЧАЛИ</span>
              <span style={{ opacity: 0.7 }}><br />с такими компаниями как:</span>
            </h1>
          </div>

          {/* Сетка с логотипами партнеров */}
          <PartnersGrid partners={partners} />
          
          {/* Футер - Made in Zvenigorod на звездном фоне */}
          <footer style={{
            width: '100%',
            textAlign: 'center',
            marginTop: '4rem',
            marginBottom: '150px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 'clamp(1.2rem, 2.25vw, 1.8rem)', // Увеличено в 1.5 раза
                fontFamily: "'Slovic', sans-serif",
                fontWeight: 'bold'
              }}>
                <span>Made in</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontFamily: "'Slovic', sans-serif",
                  fontWeight: 'bold'
                }}>
                  {/* Иконка православного купола из SVG файла */}
                  <img 
                    src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/tampls.svg`} 
                    alt="Zvenigorod dome" 
                    style={{ 
                      display: 'inline-block',
                      verticalAlign: 'middle',
                      width: '24px',
                      height: '24px'
                    }}
                  />
                  <span style={{ fontFamily: "'Slovic', sans-serif", fontWeight: 'bold' }}>Zvenigorod</span>
                </span>
              </div>
              {/* Контактные данные */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: '0.5rem'
              }}>
                {/* Email */}
                <a 
                  href="mailto:89161228435@mail.ru"
                  style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)',
                    fontFamily: "'Slovic', sans-serif",
                    textDecoration: 'none',
                    transition: 'color 0.3s ease, opacity 0.3s ease',
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 1)'
                    e.target.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)'
                    e.target.style.opacity = '0.85'
                  }}
                >
                  <span style={{ opacity: 0.6 }}>✉</span>
                  <span>89161228435@mail.ru</span>
                </a>
                
                {/* Телефоны */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '1rem',
                  fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)',
                  fontFamily: "'Slovic', sans-serif"
                }}>
                  <a 
                    href="tel:+79258465052"
                    style={{
                      color: 'rgba(255, 255, 255, 0.85)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease, opacity 0.3s ease',
                      pointerEvents: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = 'rgba(255, 255, 255, 1)'
                      e.target.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'rgba(255, 255, 255, 0.85)'
                      e.target.style.opacity = '0.85'
                    }}
                  >
                    <span style={{ opacity: 0.6 }}>📞</span>
                    <span>+7 (925) 846-50-52</span>
                  </a>
                  <a 
                    href="tel:+79777473377"
                    style={{
                      color: 'rgba(255, 255, 255, 0.85)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease, opacity 0.3s ease',
                      pointerEvents: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = 'rgba(255, 255, 255, 1)'
                      e.target.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'rgba(255, 255, 255, 0.85)'
                      e.target.style.opacity = '0.85'
                    }}
                  >
                    <span style={{ opacity: 0.6 }}>📞</span>
                    <span>+7 (977) 747-33-77</span>
                  </a>
                </div>
                
                {/* ИП информация */}
                <div style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: 'clamp(0.8rem, 1.3vw, 1rem)',
                  fontFamily: "'Slovic', sans-serif",
                  marginTop: '0.25rem',
                  fontStyle: 'italic'
                }}>
                  ИП Щербаков М.А.
                </div>
              </div>
            </div>
          </footer>
        </div>
      </section>
      </div>
    </motion.div>
    </>
  )
}

// Компонент кастомного скроллбара
function CustomScrollbar({ containerRef, scrollTop, isDragging, setIsDragging, scrollbarRef }) {
  const [scrollbarHeight, setScrollbarHeight] = useState(0)
  const [scrollbarTop, setScrollbarTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const dragStartY = useRef(0)
  const dragStartScroll = useRef(0)
  
  // Вычисляем размеры скроллбара
  useEffect(() => {
    if (!containerRef.current) return
    
    const updateScrollbar = () => {
      const container = containerRef.current
      if (!container) return
      
      const ch = container.clientHeight
      const sh = container.scrollHeight
      const st = scrollTop.get()
      
      setContainerHeight(ch)
      setContentHeight(sh)
      
      // Высота скроллбара пропорциональна видимой области
      const thumbHeight = Math.max(20, (ch / sh) * ch)
      setScrollbarHeight(thumbHeight)
      
      // Позиция скроллбара пропорциональна scrollTop
      const maxTop = ch - thumbHeight
      const scrollProgress = sh > ch ? st / (sh - ch) : 0
      setScrollbarTop(scrollProgress * maxTop)
    }
    
    const unsubscribe = scrollTop.on('change', updateScrollbar)
    updateScrollbar()
    
    // Обновляем при изменении размера окна
    window.addEventListener('resize', updateScrollbar)
    
    return () => {
      unsubscribe()
      window.removeEventListener('resize', updateScrollbar)
    }
  }, [containerRef, scrollTop])
  
  // Обработка drag скроллбара
  useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (e) => {
      if (!containerRef.current || !scrollbarRef.current) return
      
      const container = containerRef.current
      const scrollbar = scrollbarRef.current
      const containerRect = container.getBoundingClientRect()
      const scrollbarRect = scrollbar.getBoundingClientRect()
      
      const deltaY = e.clientY - dragStartY.current
      const scrollbarTrackHeight = containerHeight - scrollbarHeight
      const scrollRatio = (deltaY / scrollbarTrackHeight) * (contentHeight - containerHeight)
      
      const newScroll = Math.max(0, Math.min(contentHeight - containerHeight, dragStartScroll.current + scrollRatio))
      scrollTop.set(newScroll)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, containerRef, scrollbarRef, containerHeight, scrollbarHeight, contentHeight, scrollTop, setIsDragging])
  
  const handleMouseDown = (e) => {
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartScroll.current = scrollTop.get()
    setIsDragging(true)
  }
  
  const handleTrackClick = (e) => {
    if (!containerRef.current || !scrollbarRef.current) return
    
    const container = containerRef.current
    const scrollbar = scrollbarRef.current
    const containerRect = container.getBoundingClientRect()
    const clickY = e.clientY - containerRect.top
    
    const scrollbarTrackHeight = containerHeight - scrollbarHeight
    const clickRatio = clickY / scrollbarTrackHeight
    const newScroll = clickRatio * (contentHeight - containerHeight)
    
    scrollTop.set(Math.max(0, Math.min(contentHeight - containerHeight, newScroll)))
  }
  
  if (contentHeight <= containerHeight) return null // Не показываем скроллбар если контент помещается
  
  return (
    <div
      style={{
        position: 'fixed',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '8px',
        height: `${containerHeight}px`,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        zIndex: 10000,
        cursor: 'pointer'
      }}
      onClick={handleTrackClick}
    >
      <div
        ref={scrollbarRef}
        style={{
          position: 'absolute',
          top: `${scrollbarTop}px`,
          left: 0,
          width: '100%',
          height: `${scrollbarHeight}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '4px',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'background-color 0.2s ease',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'
          }
        }}
      />
    </div>
  )
}
