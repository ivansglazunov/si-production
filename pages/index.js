import React, { useRef, useState, useEffect, Suspense, memo, useMemo } from 'react'
import { motion, useScroll, useMotionValueEvent, useSpring, useTransform, useMotionValue, useMotionValueEvent as useMotionValueEvent2 } from 'framer-motion'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadialBarChart, RadialBar } from 'recharts'

// Компонент пункта договора с галочкой
function ContractItem({ text, progress, threshold, textColor }) {
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
}

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
          height: '100vh', 
        backgroundColor: '#ffffff',
        zIndex: 100000,
        pointerEvents: 'none'
      }}
    />
  )
}

// Компонент Хлопушка (Clapperboard) - теперь окно контактов
function Clapperboard({ isActive, isVisible, onClose }) {
  const [isDragging, setIsDragging] = useState(false)
  const dragConstraints = { left: 0, right: 0, top: 0, bottom: 0 }
  
  // Вычисляем пропорциональную высоту на основе ширины 80vw
  const width = '80vw'
  const height = 'calc(80vw / 1.333)'
  
  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (event, info) => {
    // Закрытие окна при смахивании в любую сторону
    const threshold = Math.min(window.innerHeight, window.innerWidth) * 0.25 // 25% от меньшей стороны экрана
    const distance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2)
    
    if (distance > threshold) {
      if (onClose) {
        onClose()
      }
    }
    setIsDragging(false)
  }
  
  return (
        <motion.div
      initial={false}
      animate={{
        y: isVisible 
          ? ['-100vh', 0, -30, 0, -15, 0, -8, 0] // Падение сверху с отскоками
          : '-100vh',
        x: isVisible ? 0 : '100vw', // При показе x=0, при скрытии улетает вправо
        opacity: isVisible ? 1 : 0
      }}
      transition={{
        y: isVisible ? {
          duration: 1.5,
          times: [0, 0.4, 0.5, 0.65, 0.75, 0.85, 0.92, 1],
          ease: [0.25, 0.46, 0.45, 0.94] // Ease out для падения
        } : {
          type: "spring",
          stiffness: 200,
          damping: 15,
          bounce: 0.6
        },
        x: {
          type: "spring",
          stiffness: 150,
          damping: 18,
          bounce: 0.4
        },
        opacity: {
          duration: 0.3
        }
      }}
      drag={true}
      dragConstraints={dragConstraints}
      dragElastic={0.3}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
          style={{
        position: 'relative',
        width: width,
        height: height,
        pointerEvents: 'auto',
        transformOrigin: 'top right',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Нижний блок - контакты с фейковыми данными */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '100%',
        height: '60%', // Увеличено с 50% до 60% для лучшего размещения контактов
        backgroundColor: '#000000',
        border: '2px solid #333',
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(16px, 3vw, 32px)',
        fontSize: 'clamp(14px, 2.5vw, 24px)',
        fontFamily: "'Science Gothic', monospace",
        color: '#ffffff',
        zIndex: 1,
        gap: '1rem',
        overflowY: 'auto' // Добавляем скролл если контент не вписывается
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 'bold' }}>КОНТАКТЫ</div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: '2px solid #ffffff',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              fontSize: 'clamp(12px, 2vw, 18px)',
              fontFamily: "'Science Gothic', monospace",
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#ffffff'
            }}
          >
            ЗАКРЫТЬ
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          flex: 1
        }}>
          <div style={{ 
            border: '1px solid #333', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', minWidth: '120px' }}>Телеграм:</div>
            <a 
              href="https://t.me/example" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#00a8ff',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              @example_contact
            </a>
          </div>
          
          <div style={{ 
            border: '1px solid #333', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', minWidth: '120px' }}>Email:</div>
            <div>contact@example.com</div>
          </div>
          
          <div style={{ 
            border: '1px solid #333', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', minWidth: '120px' }}>Телефон:</div>
            <div>+7 (999) 123-45-67</div>
          </div>
        </div>
        </div>

      {/* Верхняя створка - черная с текстом SI-PRODUCTION */}
        <motion.div
        initial={false}
        animate={{ rotate: isActive ? 90 : 0 }}
        transition={{ 
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94] // Плавная анимация без spring эффекта
        }}
          style={{
            position: 'absolute',
            top: 0,
          right: 0,
            width: '100%',
          height: '40%', // Уменьшено с 50% до 40% чтобы освободить место для нижней зоны
          backgroundColor: '#000000',
          border: '2px solid #333',
          transformOrigin: 'bottom right',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
                  color: '#ffffff',
          fontSize: 'clamp(20px, 4vw, 48px)',
                  fontFamily: "'Science Gothic', monospace",
                        fontWeight: 'bold',
          zIndex: 2
        }}
      >
            <span style={{
          fontFamily: "'Slovic', sans-serif",
          color: '#ff0000',
          transform: 'translateY(-3px)'
        }}>SI</span>
        <span style={{
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)'
        }}>-PRODUCTION</span>
      </motion.div>
    </motion.div>
  )
}

// Компонент Галерея для активированной ленты (слайдер)
function Gallery({ frames, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isDragging, setIsDragging] = useState(false)
  const dragConstraints = { left: 0, right: 0, top: 0, bottom: 0 }
  
  // Обновляем индекс при изменении initialIndex
  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  // Обработка клавиатуры для навигации
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0))
  }

  const handleVerticalDragStart = () => {
    setIsDragging(true)
  }

  const handleVerticalDragEnd = (event, info) => {
    // Вертикальный drag - закрытие слайдера
    const threshold = window.innerHeight * 0.25 // 25% от высоты экрана
    if (Math.abs(info.offset.y) > threshold) {
      onClose()
    }
    setIsDragging(false)
  }

  const handleHorizontalDragStart = () => {
    setIsDragging(true)
  }

  const handleHorizontalDragEnd = (event, info) => {
    // Горизонтальный drag - смена слайдов
    const threshold = 50 // Минимальное расстояние для смены слайда
    if (info.offset.x > threshold) {
      handlePrev()
    } else if (info.offset.x < -threshold) {
      handleNext()
    }
    setIsDragging(false)
  }

  return (
    <>
      {/* Overlay с затемнением */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          zIndex: 100000,
          cursor: 'pointer'
        }}
      />
      
      {/* Слайдер */}
      <motion.div
        onClick={(e) => e.stopPropagation()}
        drag="y"
        dragConstraints={dragConstraints}
        dragElastic={0.3}
        onDragStart={handleVerticalDragStart}
        onDragEnd={handleVerticalDragEnd}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100001,
          overflow: 'hidden'
        }}
      >
        {/* Контейнер слайдов */}
        <div
          style={{
            position: 'relative',
            width: '90vw',
            height: '90vh',
            maxWidth: '1400px',
            maxHeight: '900px'
          }}
        >
          {frames.map((color, index) => {
            const isActive = index === currentIndex
            return (
              <motion.div
                key={index}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1 : 0.8,
                  x: isActive ? 0 : (index < currentIndex ? -100 : 100)
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                drag="x"
                dragConstraints={dragConstraints}
                dragElastic={0.2}
                onDragStart={handleHorizontalDragStart}
                onDragEnd={handleHorizontalDragEnd}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: isActive ? 'auto' : 'none',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: '12px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Кнопка "Назад" в левом верхнем углу */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          style={{
            position: 'absolute',
            top: '32px',
            left: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '18px',
            fontFamily: "'Science Gothic', monospace",
            cursor: 'pointer',
            zIndex: 100002,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
        >
          <span style={{ fontSize: '24px' }}>←</span>
          <span>Назад</span>
        </button>

        {/* Кнопки навигации */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handlePrev()
          }}
          style={{
            position: 'absolute',
            left: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100002,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
        >
          ‹
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleNext()
          }}
          style={{
            position: 'absolute',
            right: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100002,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
        >
          ›
        </button>

        {/* Индикатор текущего слайда */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 100002
          }}
        >
          {frames.map((_, index) => (
            <div
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(index)
              }}
              style={{
                width: index === currentIndex ? '32px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: index === currentIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Счетчик слайдов */}
        <div
          style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            color: '#ffffff',
            fontSize: '18px',
            fontFamily: "'Science Gothic', monospace",
            zIndex: 100002,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 16px',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        >
          {currentIndex + 1} / {frames.length}
        </div>
      </motion.div>
    </>
  )
}

function ProgressChart({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)
  const lastUpdateRef = useRef(0)

  // Оптимизация: дебаунсинг обновлений диаграммы (обновляем каждые 100ms вместо каждого кадра)
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const now = Date.now()
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)

    // Обновляем только если прошло 100ms и значимое изменение (>1%)
    if (now - lastUpdateRef.current > 100 && Math.abs(progressPercent - progress) > 1) {
      setProgress(progressPercent)
      lastUpdateRef.current = now
    }
  })

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
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PieChart width={600} height={600}>
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
}

// Компонент линейной диаграммы с точками, зависящими от скролла
function LineChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)
  const lastUpdateRef = useRef(0)

  // Оптимизация: дебаунсинг обновлений диаграммы
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const now = Date.now()
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)

    if (now - lastUpdateRef.current > 100 && Math.abs(progressPercent - progress) > 1) {
      setProgress(progressPercent)
      lastUpdateRef.current = now
    }
  })

  // Создаем данные для диаграммы - точки двигаются вверх и вниз в зависимости от скролла
  const data = [
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
  ]

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'absolute',
      top: 0,
      left: 0,
      padding: 0,
      zIndex: 1,
      pointerEvents: 'none'
    }}>
      <ResponsiveContainer width="100%" height="100%">
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
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff'
            }}
          />
          {/* Старая линия с точками */}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#ffffff" 
            strokeWidth={3}
            dot={{ fill: '#ffffff', r: 6 }}
            activeDot={{ r: 8 }}
          />
          {/* Новая угловатая линия без точек */}
          <Line 
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
}

// Компонент радарной диаграммы
function RadarChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)
  const lastUpdateRef = useRef(0)

  // Оптимизация: дебаунсинг обновлений диаграммы
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const now = Date.now()
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)

    if (now - lastUpdateRef.current > 100 && Math.abs(progressPercent - progress) > 1) {
      setProgress(progressPercent)
      lastUpdateRef.current = now
    }
  })

  const data = [
    { subject: 'A', value: 50 + progress * 0.3, fullMark: 100 },
    { subject: 'B', value: 60 - progress * 0.2, fullMark: 100 },
    { subject: 'C', value: 40 + progress * 0.4, fullMark: 100 },
    { subject: 'D', value: 70 - progress * 0.3, fullMark: 100 },
    { subject: 'E', value: 55 + progress * 0.25, fullMark: 100 },
    { subject: 'F', value: 45 - progress * 0.35, fullMark: 100 }
  ]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
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
}

// Компонент радиальной столбчатой диаграммы, зависимый от скролла
function RadialBarChartComponent({ progressMotionValue }) {
  const [progress, setProgress] = useState(0)
  const lastUpdateRef = useRef(0)

  // Оптимизация: дебаунсинг обновлений диаграммы
  useMotionValueEvent(progressMotionValue, "change", (latest) => {
    const now = Date.now()
    const progressPercent = Math.min(Math.max(latest * 100, 0), 100)

    if (now - lastUpdateRef.current > 100 && Math.abs(progressPercent - progress) > 1) {
      setProgress(progressPercent)
      lastUpdateRef.current = now
    }
  })

  const data = [
    { name: 'A', value: 20 + progress * 0.3, fill: '#ffffff' },
    { name: 'B', value: 40 - progress * 0.2, fill: '#ffffff' },
    { name: 'C', value: 60 + progress * 0.4, fill: '#ffffff' },
    { name: 'D', value: 30 - progress * 0.3, fill: '#ffffff' },
    { name: 'E', value: 50 + progress * 0.25, fill: '#ffffff' },
    { name: 'F', value: 70 - progress * 0.35, fill: '#ffffff' }
  ]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="20%" 
          outerRadius="80%" 
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar 
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
}

// Компонент карусели с постерами фильмов (вращающаяся карусель)
const MoviesCarousel = memo(function MoviesCarousel({ movies, mouseParallaxValues = null }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [wasDragging, setWasDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
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
      >
        {movies.map((movie, index) => {
          const baseStyle = getTransform(index)
          const offset = Math.abs(index - currentIndex)
          
          // Определяем параллакс в зависимости от расстояния от центра
          // Параллакс работает только когда компонент в viewport
          let parallaxX, parallaxY, rotateX, rotateY
          if (!isInViewport) {
            // Если не в viewport - без параллакса
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
function PerforatedBorderTexture({ scrollProgress, position = 'top', mouseOffset = null }) {
  // Параметры текстуры - одинаковые отступы
  const gap = 5 // Отступ между элементами и от краев
  const rectWidth = 20
  const rectHeight = 16
  const rectSpacing = rectWidth + gap * 2 // Ширина элемента + отступы с обеих сторон
  const borderRadius = 2 // Меньше закругление
  const edgeOffset = 20 // Отступ от края экрана

  // Преобразуем scrollProgress в смещение текстуры с spring эффектом
  const scrollOffsetRaw = useTransform(scrollProgress, [0, 1], [0, 600]) // Увеличено в 3 раза (200 -> 600)
  const scrollOffset = useSpring(scrollOffsetRaw, {
    stiffness: 50,
    damping: 20,
    mass: 1
  })
  
  // Комбинируем скролл и накопленное смещение от мыши (всегда в одну сторону)
  const combinedOffset = useMotionValue(0)
  
  useEffect(() => {
    const updateOffset = () => {
      const scroll = scrollOffset.get()
      const mouse = mouseOffset ? mouseOffset.get() : 0
      // Мышь всегда добавляет смещение в одну сторону (вправо)
      combinedOffset.set(scroll + mouse)
    }
    
    const unsubscribeScroll = scrollOffset.on('change', updateOffset)
    const unsubscribeMouse = mouseOffset ? mouseOffset.on('change', updateOffset) : null
    
    updateOffset()
    
    return () => {
      unsubscribeScroll()
      if (unsubscribeMouse) unsubscribeMouse()
    }
  }, [scrollOffset, mouseOffset, combinedOffset])
  
  const backgroundPosition = useTransform(combinedOffset, (value) => `${value}px 0`)

  // Создаем SVG паттерн с закругленными прямоугольниками
  const createPattern = () => {
    const svg = `<svg width="${rectSpacing}" height="${rectHeight}" xmlns="http://www.w3.org/2000/svg">
<rect x="${gap}" y="0" width="${rectWidth}" height="${rectHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="#ffffff" opacity="0.4"/>
</svg>`
    const encoded = encodeURIComponent(svg)
    return `data:image/svg+xml;charset=utf-8,${encoded}`
  }

  const patternUrl = createPattern()

  return (
    <motion.div
      style={{
        position: 'absolute',
        [position]: `${edgeOffset}px`, // Отступ от края
        left: 0,
        width: '100%',
        height: `${rectHeight + 4}px`,
        backgroundImage: `url("${patternUrl}")`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: `${rectSpacing}px ${rectHeight}px`,
        backgroundPosition: backgroundPosition,
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
      opacity: Math.random() * 0.6 + 0.3 // Прозрачность от 0.3 до 0.9 (выше)
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
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            opacity: star.opacity,
            boxShadow: `0 0 ${star.size}px rgba(255, 255, 255, ${star.opacity * 0.5})`
          }}
        />
      ))}
    </div>
  )
}, (prevProps, nextProps) => {
  // Перерисовываем только если изменился starCount
  return prevProps.starCount === nextProps.starCount
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

function KinoLenta({ frameCount, progress, center, topOffset = 0, speed = 1, angle = 0, inverse = false, scale = 1, onFrameClick, lentaId, containerRef, parallaxX, parallaxY, rotateX, rotateY }) {
  // Генерируем случайные цвета для каждого кадра один раз при монтировании
  const [frames] = useState(() => {
    return Array.from({ length: frameCount }, () => {
      const r = Math.floor(Math.random() * 256)
      const g = Math.floor(Math.random() * 256)
      const b = Math.floor(Math.random() * 256)
      return `rgb(${r}, ${g}, ${b})`
    })
  })
  
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
  const translateXValue = useTransform(progressMotion, (prog) => {
    let targetLeftPosition = Math.max(-200, Math.min(200, (prog - center) * 500 * speed))
    if (inverse) {
      targetLeftPosition = -targetLeftPosition
    }
    return `translateX(${targetLeftPosition}vw)`
  })

  return (
    // Внешний контейнер - позиционирование внутри скроллящейся области
    // Используем position: absolute для позиционирования относительно скроллящегося контейнера
          <div style={{
      position: 'absolute',
      top: `calc(50vh + ${topOffset}vh)`,
      left: '50%',
      transform: 'translate(-50%, -50%)',
      transformOrigin: 'center center',
      zIndex: 1000,
      pointerEvents: 'none' // Контейнер не перехватывает события - скролл проходит сквозь
          }}>
      {/* Контейнер поворота - поворачивается на angle градусов + параллакс */}
            <motion.div
        style={{
        rotate: `${angle}deg`,
        transformOrigin: 'center center',
        pointerEvents: 'none',
        x: parallaxX || 0,
        y: parallaxY || 0,
        rotateX: rotateX || 0,
        rotateY: rotateY || 0,
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
          {frames.map((color, index) => {
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
                <div
                  style={{
                    position: 'absolute',
                    top: `${borderWidth}px`,
                    left: 0,
                    width: '100%',
                    height: `${frameHeight}px`,
                    backgroundColor: color,
                    borderRadius: '2px'
                  }}
                />
              </div>
            )
          })}
        </motion.div>
      </motion.div>
            </div>
  )
}

export default function Home() {
  const containerRef = useRef(null)
  const firstScreenRef = useRef(null)
  const secondScreenRef = useRef(null)
  const thirdScreenRef = useRef(null)
  
  // Motion values для progress - без перерендеров
  const progressMotionValue = useMotionValue(0)
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
  const [secondScreenProgressText, setSecondScreenProgressText] = useState(0)
  const [thirdScreenProgressText, setThirdScreenProgressText] = useState(0)
  const [flashActive, setFlashActive] = useState(false)
  const [clapperboardActive, setClapperboardActive] = useState(false) // Отключено по умолчанию для производительности
  const [clapperboardVisible, setClapperboardVisible] = useState(false) // Скрыто по умолчанию

  // Состояние для активной галереи
  const [activeGallery, setActiveGallery] = useState(null) // { lentaId, frameIndex, frames }

  // Ленивая загрузка лент для производительности
  const [showLents, setShowLents] = useState(false)

  // Показываем ленты после полной загрузки страницы (оптимизация производительности)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLents(true)
    }, 1000) // Показываем ленты через 1 секунду после загрузки

    return () => clearTimeout(timer)
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
  const lentaLargeParallaxX = useTransform(mouseX, [0, 100], [-30, 30]) // -30px до +30px
  const lentaLargeParallaxY = useTransform(mouseY, [0, 100], [-30, 30]) // -30px до +30px
  const lentaLargeRotateX = useTransform(mouseY, [0, 100], [8, -8]) // градусы
  const lentaLargeRotateY = useTransform(mouseX, [0, 100], [-8, 8]) // градусы

  // Для средних лент (scale < 1.5): средний эффект
  const lentaMediumParallaxX = useTransform(mouseX, [0, 100], [-20, 20]) // -20px до +20px
  const lentaMediumParallaxY = useTransform(mouseY, [0, 100], [-20, 20]) // -20px до +20px
  const lentaMediumRotateX = useTransform(mouseY, [0, 100], [5, -5]) // градусы
  const lentaMediumRotateY = useTransform(mouseX, [0, 100], [-5, 5]) // градусы

  // Для маленьких лент: слабый эффект
  const lentaSmallParallaxX = useTransform(mouseX, [0, 100], [-15, 15]) // -15px до +15px
  const lentaSmallParallaxY = useTransform(mouseY, [0, 100], [-15, 15]) // -15px до +15px
  const lentaSmallRotateX = useTransform(mouseY, [0, 100], [3, -3]) // градусы
  const lentaSmallRotateY = useTransform(mouseX, [0, 100], [-3, 3]) // градусы

  // Для крупной круговой диаграммы в центре: СЛАБЫЙ эффект (она на переднем плане)
  const chartCenterParallaxX = useTransform(mouseX, [0, 100], [-5, 5]) // -5px до +5px
  const chartCenterParallaxY = useTransform(mouseY, [0, 100], [-5, 5]) // -5px до +5px
  const chartCenterRotateX = useTransform(mouseY, [0, 100], [1, -1]) // градусы
  const chartCenterRotateY = useTransform(mouseX, [0, 100], [-1, 1]) // градусы

  // Для маленьких диаграмм на заднем плане: СИЛЬНЫЙ эффект (они дальше)
  const chartBackParallaxX = useTransform(mouseX, [0, 100], [-25, 25]) // -25px до +25px
  const chartBackParallaxY = useTransform(mouseY, [0, 100], [-25, 25]) // -25px до +25px
  const chartBackRotateX = useTransform(mouseY, [0, 100], [6, -6]) // градусы
  const chartBackRotateY = useTransform(mouseX, [0, 100], [-6, 6]) // градусы

  // Комбинированные transforms для центрирования + параллакс
  const chartCenterX = useTransform(chartCenterParallaxX, (px) => `calc(-50% + ${px}px)`)
  const chartCenterY = useTransform(chartCenterParallaxY, (py) => `calc(-50% + ${py}px)`)
  const chartTopX = useTransform(chartBackParallaxX, (px) => `calc(-50% + ${px}px)`)
  const chartTopY = useTransform(chartBackParallaxY, (py) => `calc(2rem + ${py}px)`)
  const chartBottomX = useTransform(chartBackParallaxX, (px) => `calc(-50% + ${px}px)`)
  const chartBottomY = useTransform(chartBackParallaxY, (py) => `calc(-2rem + ${py}px)`)
  
  // Для помех на втором экране: комбинируем скролл и мышь
  // Параллакс от мыши для помех
  const grainMouseX = useTransform(mouseX, [0, 100], [-30, 30]) // -30px до +30px
  const grainMouseY = useTransform(mouseY, [0, 100], [-30, 30]) // -30px до +30px
  
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
  
  // Для лент перфорации: накапливаем смещение при движении мыши (как вращение пленки)
  const perforationMouseOffset = useMotionValue(0)
  const lastMouseX = useRef(50) // Начальная позиция мыши (центр)
  
  useEffect(() => {
    const updatePerforationOffset = () => {
      const currentMouseX = mouseX.get()
      const delta = Math.abs(currentMouseX - lastMouseX.current)
      
      // Если мышь движется, добавляем смещение в одну сторону (вправо)
      if (delta > 0.1) { // Порог для определения движения
        // Скорость зависит от скорости движения мыши
        const speed = Math.min(delta * 2, 5) // Ограничиваем максимальную скорость
        perforationMouseOffset.set(perforationMouseOffset.get() + speed)
        lastMouseX.current = currentMouseX
      }
    }
    
    // Небольшое затухание накопленного смещения (имитация трения пленки)
    const decayInterval = setInterval(() => {
      const current = perforationMouseOffset.get()
      if (current > 0) {
        perforationMouseOffset.set(Math.max(0, current - 0.5)) // Медленное затухание
      }
    }, 100) // Каждые 100мс уменьшаем на 0.5
    
    const unsubscribe = mouseX.on('change', updatePerforationOffset)
    
    return () => {
      unsubscribe()
      clearInterval(decayInterval)
    }
  }, [mouseX, perforationMouseOffset])
  
  // Для карточек проектов: разная сила параллакса в зависимости от расстояния от центра
  // Центральная карточка (выбранная) - сильный параллакс
  const movieCardCenterParallaxX = useTransform(mouseX, [0, 100], [-15, 15]) // -15px до +15px
  const movieCardCenterParallaxY = useTransform(mouseY, [0, 100], [-15, 15]) // -15px до +15px
  const movieCardCenterRotateX = useTransform(mouseY, [0, 100], [3, -3]) // градусы
  const movieCardCenterRotateY = useTransform(mouseX, [0, 100], [-3, 3]) // градусы
  
  // Близкие карточки (offset 1) - средний параллакс
  const movieCardNearParallaxX = useTransform(mouseX, [0, 100], [-10, 10]) // -10px до +10px
  const movieCardNearParallaxY = useTransform(mouseY, [0, 100], [-10, 10]) // -10px до +10px
  const movieCardNearRotateX = useTransform(mouseY, [0, 100], [2, -2]) // градусы
  const movieCardNearRotateY = useTransform(mouseX, [0, 100], [-2, 2]) // градусы
  
  // Дальние карточки (offset 2) - слабый параллакс
  const movieCardFarParallaxX = useTransform(mouseX, [0, 100], [-5, 5]) // -5px до +5px
  const movieCardFarParallaxY = useTransform(mouseY, [0, 100], [-5, 5]) // -5px до +5px
  const movieCardFarRotateX = useTransform(mouseY, [0, 100], [1, -1]) // градусы
  const movieCardFarRotateY = useTransform(mouseX, [0, 100], [-1, 1]) // градусы

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

  // 6 популярных российских кинопродакшенов/киностудий, принимающих госзаказы
  const partners = [
    { name: 'Мосфильм' },
    { name: 'Ленфильм' },
    { name: 'СТВ' },
    { name: 'Централ Партнершип' },
    { name: 'ВГТРК' },
    { name: 'Первый канал' }
  ]

  // Топ-20 популярных российских фильмов последних 5 лет (2019-2024) с правильными ID для Кинопоиска
  const topMovies = [
    { title: 'Т-34', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1900788/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Движение вверх', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Холоп', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Серебряные коньки', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Огонь', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Вторжение', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Лёд 2', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Союз спасения', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Стриптизёрши', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Время первых', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Экипаж', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Притяжение', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Лёд', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: '28 панфиловцев', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Душа', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Селфи', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Холоп 2', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Чебурашка', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Сердце Пармы', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 },
    { title: 'Вызов', poster: 'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/9ed687b1-0c44-4f0c-8b0f-3b0f3b0f3b0f/orig', kinopoiskId: 1115433 }
  ]
  
  const handleFrameClick = (lentaId, frameIndex, frames) => {
    setActiveGallery({ lentaId, frameIndex, frames })
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
  
  const handleClapperboardClose = () => {
    setClapperboardActive(false)
    setTimeout(() => {
      setClapperboardVisible(false)
    }, 600) // Время на анимацию закрытия
  }

  // Кастомный скролл - синхронизируем customScrollTop с реальным scrollY
  const isUpdatingScroll = useRef(false)
  
  useEffect(() => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    
    // Синхронизируем customScrollTop -> scrollTop
    const unsubscribe = customScrollTop.on('change', (value) => {
      if (!isUpdatingScroll.current && container.scrollTop !== value) {
        isUpdatingScroll.current = true
        container.scrollTop = value
        requestAnimationFrame(() => {
          isUpdatingScroll.current = false
        })
      }
    })
    
    // Обновляем customScrollTop при изменении реального scrollTop (на случай внешних изменений)
    const updateCustomScroll = () => {
      if (!isUpdatingScroll.current) {
        const currentScroll = container.scrollTop
        if (Math.abs(customScrollTop.get() - currentScroll) > 1) {
          customScrollTop.set(currentScroll)
        }
      }
    }
    
    container.addEventListener('scroll', updateCustomScroll, { passive: true })
    
    return () => {
      unsubscribe()
      container.removeEventListener('scroll', updateCustomScroll)
    }
  }, [customScrollTop])
  
  // Обработка wheel событий для кастомного скролла
  useEffect(() => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const handleWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY
      const currentScroll = customScrollTop.get()
      const maxScroll = container.scrollHeight - container.clientHeight
      const newScroll = Math.max(0, Math.min(maxScroll, currentScroll + delta))
      customScrollTop.set(newScroll)
    }
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [customScrollTop])
  
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
      grainBackgroundXValue.set(scroll * 200 + (mouseXVal - 0.5) * 50)
      grainBackgroundYValue.set(scroll * 200 + (mouseYVal - 0.5) * 50)
      
      // Изменяем интенсивность шума на основе мыши и скролла (не движение, а изменение)
      const noiseIntensity = 0.4 + scroll * 0.3 + (mouseXVal + mouseYVal) * 0.1
      grainNoiseIntensity.set(Math.min(1, Math.max(0.3, noiseIntensity)))
      
      const noiseOpacity = 0.5 + scroll * 0.2 + (mouseXVal + mouseYVal) * 0.15
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
    const unsubscribeMouseX = mouseX.on('change', updateScratches)
    const unsubscribeMouseY = mouseY.on('change', updateScratches)
    
    return () => {
      unsubscribeScroll()
      unsubscribeMouseX()
      unsubscribeMouseY()
    }
  }, [secondScreenScrollProgress, mouseX, mouseY, scratchRedrawTrigger])
  
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
      {/* Компонент Вспышка */}
      <Flash isActive={flashActive} onComplete={handleFlashComplete} />
      
      {/* Галерея для активированной ленты */}
      {activeGallery && (
        <Gallery
          frames={activeGallery.frames}
          initialIndex={activeGallery.frameIndex}
          onClose={handleCloseGallery}
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
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span 
          className="si-text"
          style={{
            fontFamily: "'Slovic', sans-serif",
            color: '#ff0000',
            transform: 'translateY(-3px)'
          }}
        >SI</span>
        <span className="dash-text">-</span>
        <span 
          className="production-text"
          style={{
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8)'
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
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 99999, // Ниже вспышки (100000)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Clapperboard isActive={clapperboardActive} isVisible={clapperboardVisible} onClose={handleClapperboardClose} />
            </div>


    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden', // Отключаем нативный скролл
        overflowX: 'hidden'
      }}
    >
      {/* Ленты размещены внутри скроллящейся зоны */}
      {/* Используем общий прогресс скролла (progress / 100), чтобы ленты могли двигаться непрерывно */}
      {/* center пересчитывается относительно первого экрана: делим на количество экранов (3) */}
      {/* Ленты используют absolute позиционирование внутри скроллящегося контейнера */}
      {/* Первая лента: когда Составление плана 60%, лента по центру экрана, размер вдвое */}
      <KinoLenta lentaId="lenta-1" frameCount={8} progress={progressMotionValue} center={0.6 * 0.6 / 3} topOffset={0} speed={1.0} angle={15} scale={2} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} />

      {/* Вторая лента: inverse (справа налево), центр при 90%, topOffset 25vh, противоположный угол */}
      <KinoLenta lentaId="lenta-2" frameCount={8} progress={progressMotionValue} center={0.9 * 0.6 / 3} topOffset={25} speed={1.0} angle={-15} inverse={true} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} />

      {/* Ленты сверху - распределены пониже */}
      <KinoLenta lentaId="lenta-3" frameCount={8} progress={progressMotionValue} center={0.3 * 0.6 / 3} topOffset={-45} speed={1.5} angle={20} scale={1.5} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} />
      <KinoLenta lentaId="lenta-4" frameCount={8} progress={progressMotionValue} center={0.4 * 0.6 / 3} topOffset={-35} speed={1.2} angle={15} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} />
      <KinoLenta lentaId="lenta-5" frameCount={8} progress={progressMotionValue} center={0.5 * 0.6 / 3} topOffset={-30} speed={0.7} angle={-25} inverse={true} scale={1.2} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} />
      <KinoLenta lentaId="lenta-6" frameCount={8} progress={progressMotionValue} center={0.35 * 0.6 / 3} topOffset={-40} speed={1.3} angle={10} scale={1.8} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} />
      <KinoLenta lentaId="lenta-7" frameCount={8} progress={progressMotionValue} center={0.65 * 0.6 / 3} topOffset={-25} speed={0.9} angle={-18} inverse={true} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} />
      <KinoLenta lentaId="lenta-8" frameCount={8} progress={progressMotionValue} center={0.45 * 0.6 / 3} topOffset={-20} speed={1.1} angle={22} scale={1.3} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} />
      <KinoLenta lentaId="lenta-9" frameCount={8} progress={progressMotionValue} center={0.55 * 0.6 / 3} topOffset={-15} speed={1.4} angle={-12} inverse={true} scale={1.6} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} />
      <KinoLenta lentaId="lenta-10" frameCount={8} progress={progressMotionValue} center={0.7 * 0.6 / 3} topOffset={-10} speed={0.8} angle={-15} inverse={true} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} />

      {/* Дополнительные ленты в центре */}
      <KinoLenta lentaId="lenta-11" frameCount={8} progress={progressMotionValue} center={0.75 * 0.6 / 3} topOffset={10} speed={1.2} angle={-12} inverse={true} scale={1.4} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} />

      {/* Дополнительные ленты снизу - меньше лент */}
      <KinoLenta lentaId="lenta-12" frameCount={8} progress={progressMotionValue} center={0.8 * 0.6 / 3} topOffset={30} speed={0.8} angle={18} scale={1.6} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaLargeParallaxX} parallaxY={lentaLargeParallaxY} rotateX={lentaLargeRotateX} rotateY={lentaLargeRotateY} />
      <KinoLenta lentaId="lenta-13" frameCount={8} progress={progressMotionValue} center={0.85 * 0.6 / 3} topOffset={38} speed={1.1} angle={-20} inverse={true} onFrameClick={handleFrameClick} containerRef={containerRef} parallaxX={lentaMediumParallaxX} parallaxY={lentaMediumParallaxY} rotateX={lentaMediumRotateX} rotateY={lentaMediumRotateY} />
      
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
          height: '100vh', 
          backgroundColor: '#0a0a0a', // Чуть светлее черного
          position: 'relative'
        }}
      >
        {/* Индикатор прогресса первого экрана */}
        <div style={{
          position: 'sticky',
          top: '70px',
          width: 'fit-content',
          left: '16px',
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
          Составление плана: {firstScreenProgressText}%
            </div>

        {/* Надпись ПЕРВЫЙ ЭКРАН */}
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
            Первый экран
            </div>
      </section>

      {/* Второй экран */}
      <section 
        ref={secondScreenRef}
        style={{ 
        width: '100vw', 
          height: '100vh', 
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
            Запуск процессов: {secondScreenProgressText}%
          </div>
        </div>
        
        {/* Статические помехи как на старой пленке - зернистость */}
        <GrainLayerComponent
          zIndex={100}
          opacity={0.6}
          backgroundImage={`
            radial-gradient(circle at 0 0, rgba(255,255,255,0.15) 1px, transparent 1px),
            radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 1px),
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 0.5px, transparent 0.5px)
          `}
          backgroundSize="4px 4px, 4px 4px, 2px 2px"
          mixBlendMode="overlay"
          filter="contrast(2) brightness(0.85)"
          grainBackgroundPosition={grainBackgroundPosition}
          grainNoiseOpacity={grainNoiseOpacity}
        />
        
        {/* Дополнительный слой зернистости - точки */}
        <GrainLayerComponent
          zIndex={101}
          opacity={0.5}
          backgroundImage={`
            repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 3px),
            repeating-linear-gradient(90deg, transparent 0px, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 3px)
          `}
          backgroundSize="2px 2px"
          mixBlendMode="screen"
          filter="contrast(1.8)"
          grainBackgroundPosition={grainBackgroundPosition}
          grainNoiseOpacity={grainNoiseOpacity}
        />
        
        {/* Третий слой - более крупная зернистость */}
        <GrainLayerComponent
          zIndex={102}
          opacity={0.4}
          backgroundImage={`
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 0px, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px, transparent 2px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 0px, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px, transparent 2px)
          `}
          backgroundSize="3px 3px"
          mixBlendMode="multiply"
          filter="contrast(1.5)"
          grainBackgroundPosition={grainBackgroundPosition}
          grainNoiseOpacity={grainNoiseOpacity}
        />
        
        {/* Четвертый слой - очень заметная зернистость с точками */}
        <GrainLayerComponent
          zIndex={103}
          opacity={0.7}
          backgroundImage={`
            repeating-conic-gradient(from 0deg at 50% 50%, 
              rgba(255,255,255,0.2) 0deg, 
              transparent 1deg, 
              transparent 2deg, 
              rgba(0,0,0,0.2) 2deg, 
              rgba(0,0,0,0.2) 3deg, 
              transparent 3deg, 
              transparent 4deg
            )
          `}
          backgroundSize="2px 2px"
          mixBlendMode="overlay"
          filter="contrast(2.5) brightness(0.8)"
          grainBackgroundPosition={grainBackgroundPosition}
          grainNoiseOpacity={grainNoiseOpacity}
        />
        
        {/* Горизонтальные царапины - перерисовываются при движении мыши */}
        <ScratchesComponent count={15} scratchRedrawTrigger={scratchRedrawTrigger} />
        
        {/* Вертикальные полосы повреждений */}
        <GrainLayerComponent
          zIndex={103}
          opacity={0.25}
          backgroundImage={`
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 2px,
              rgba(255, 255, 255, 0.15) 2px,
              rgba(255, 255, 255, 0.15) 3px,
              transparent 3px,
              transparent 8px
            )
          `}
          backgroundSize="60px 100%"
          mixBlendMode="overlay"
          grainBackgroundPosition={grainBackgroundPosition}
          grainNoiseOpacity={grainNoiseOpacity}
        />

        {/* Движущиеся ленты перфорации по границам экрана */}
        <PerforatedBorderTexture scrollProgress={secondScreenScrollProgress} position="top" mouseOffset={perforationMouseOffset} />
        <PerforatedBorderTexture scrollProgress={secondScreenScrollProgress} position="bottom" mouseOffset={perforationMouseOffset} />
        
        {/* Линейная диаграмма на весь экран */}
        <LineChartComponent progressMotionValue={secondScreenScrollProgress} />
        
        {/* Радарная диаграмма - сверху с отступом, задний план, СИЛЬНЫЙ параллакс */}
        <motion.div
          style={{
            position: 'absolute',
            top: '2rem',
            left: '50%',
            zIndex: 12,
            width: '25vw',
            height: '25vw',
            maxWidth: '300px',
            maxHeight: '300px',
            pointerEvents: 'none',
            x: chartTopX,
            y: chartTopY,
            rotateX: chartBackRotateX,
            rotateY: chartBackRotateY,
            perspective: '1000px',
            transformStyle: 'preserve-3d'
          }}
        >
          <RadarChartComponent progressMotionValue={secondScreenScrollProgress} />
        </motion.div>
        
        {/* Радиальная столбчатая диаграмма - снизу с отступом, задний план, СИЛЬНЫЙ параллакс */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            zIndex: 12,
            width: '25vw',
            height: '25vw',
            maxWidth: '300px',
            maxHeight: '300px',
            pointerEvents: 'none',
            x: chartBottomX,
            y: chartBottomY,
            rotateX: chartBackRotateX,
            rotateY: chartBackRotateY,
            perspective: '1000px',
            transformStyle: 'preserve-3d'
          }}
        >
          <RadialBarChartComponent progressMotionValue={secondScreenScrollProgress} />
        </motion.div>

        {/* Круговая диаграмма прогресса - по центру, передний план, СЛАБЫЙ параллакс */}
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
            x: chartCenterX,
            y: chartCenterY,
            rotateX: chartCenterRotateX,
            rotateY: chartCenterRotateY,
            perspective: '1000px',
            transformStyle: 'preserve-3d'
          }}
        >
          <ProgressChart progressMotionValue={secondScreenScrollProgress} />
        </motion.div>
        
          {/* Контейнер для договора */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(210mm, 90vw)',
            height: 'min(297mm, calc(90vw * 1.414))',
            maxHeight: '90vh',
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
                padding: 'clamp(1rem, 3vw, 2rem)',
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
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingLeft: '2em',
              paddingRight: '2em'
            }}>
              <ContractItem text="Организуем пре-продакшн и локации" progress={secondScreenProgressMotionValue} threshold={35} textColor="#ffffff" />
              <ContractItem text="Согласуем все договоренности и разрешения" progress={secondScreenProgressMotionValue} threshold={40} textColor="#ffffff" />
              <ContractItem text="Проводим съемочный процесс и постпродакшн" progress={secondScreenProgressMotionValue} threshold={50} textColor="#ffffff" />
              <ContractItem text="Соберем результаты и финальный монтаж" progress={secondScreenProgressMotionValue} threshold={60} textColor="#ffffff" />
              <ContractItem text="Обеспечим дистрибуцию и промо-компанию" progress={secondScreenProgressMotionValue} threshold={65} textColor="#ffffff" />
            </div>

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
          minHeight: '100vh',
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

        {/* Секция ПРОЕКТЫ */}
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
          {/* Заголовок ПРОЕКТЫ */}
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            <h1 
              style={{
                fontSize: 'clamp(2em, 5vw, 4em)',
                fontFamily: "'Slovic', sans-serif",
                color: '#ffffff',
                margin: 0
              }}
            >
              ПРОЕКТЫ
            </h1>
          </div>

          {/* Карусель с фильмами */}
          <div style={{ minHeight: '500px' }}>
            <MoviesCarousel 
              movies={topMovies}
              mouseParallaxValues={movieParallaxValues}
            />
          </div>
        </div>

        {/* Секция ПАРТНЕРЫ */}
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
          {/* Заголовок ПАРТНЕРЫ */}
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            <h1
              style={{
                fontSize: 'clamp(2em, 5vw, 4em)',
                fontFamily: "'Slovic', sans-serif",
                color: '#ffffff',
                margin: 0
              }}
            >
              ПАРТНЕРЫ
            </h1>
          </div>

          {/* Сетка с логотипами партнеров */}
          <PartnersGrid partners={partners} />
          
          {/* Футер - Made in Zvenigorod на звездном фоне */}
          <footer style={{
            width: '100%',
            textAlign: 'center',
            marginTop: '4rem',
            marginBottom: '150px',
            pointerEvents: 'none'
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
                  src="/tampls.svg" 
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
          </footer>
        </div>
      </section>
    </div>
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
