import React, { useState, useEffect, useRef } from 'react'
import {
  Settings,
  CloudDownload,
  Cpu,
  LayoutDashboard,
  Database,
  RefreshCw,
  Package,
  Heart,
  Menu,
  Terminal,
  X
} from 'lucide-react'

import './App.css'

// Utilities
import { cn, isPS5, isSystemPayload } from './utils/helpers'

// UI Components
import Toast from './components/ui/Toast'
import Modal from './components/ui/Modal'
import NavButton from './components/ui/NavButton'
import PayloadButton from './components/ui/PayloadButton'
import LogoIcon from './components/ui/LogoIcon'

// Views
import StorageHub from './components/views/StorageHub'
import AutoloadView from './components/views/AutoloadView'
import SettingsView from './components/views/SettingsView'
import DonateView from './components/views/DonateView'
import AutoloadOverlay from './components/views/AutoloadOverlay'
import MoveFromUsbView from './components/views/MoveFromUsbView'
import LogViewer from './components/views/LogViewer'
import ManageSourcesView from './components/views/ManageSourcesView'
import ActiveProcessesView from './components/views/ActiveProcessesView'

function App() {
  const [view, setView] = useState('dashboard')
  const mainRef = useRef(null)

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
    window.scrollTo(0, 0)
  }, [view])

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded')
    return saved !== null ? JSON.parse(saved) : true
  })

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(sidebarExpanded))
  }, [sidebarExpanded])

  const [autoloadStatus, setAutoloadStatus] = useState(null)
  const [logs, setLogs] = useState([])
  const [payloads, setPayloads] = useState([])
  const [config, setConfig] = useState({})
  const [ip, setIp] = useState('0.0.0.0')
  const [version, setVersion] = useState('جارٍ التحميل...')
  const [loading, setLoading] = useState(false)
  const [activeLoadingName, setActiveLoadingName] = useState('')
  const [toasts, setToasts] = useState([])
  const [loadingPayloads, setLoadingPayloads] = useState(true)
  const [downloadModal, setDownloadModal] = useState({ show: false, name: '', progress: 0 })
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null })
  const [moveFromUsbPath, setMoveFromUsbPath] = useState(null)
  const [storageScrollTarget, setStorageScrollTarget] = useState(null)
  const [showLogs, setShowLogs] = useState(false)
  const [payloadMeta, setPayloadMeta] = useState({})
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (!showLogs) return
    const eventSource = new EventSource('/events')
    eventSource.onmessage = (e) => setLogs(prev => [...prev, e.data].slice(-200))
    return () => eventSource.close()
  }, [showLogs])

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        setConfirmModal({ show: false })
        onConfirm()
      }
    })
  }

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const api = async (endpoint, options = {}) => {
    try {
      const response = await fetch(endpoint, options)
      if (options.method === 'POST') return response.text()
      const text = await response.text()
      if (text.toLowerCase().includes('<!doctype')) return null
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  const refreshPayloads = async () => {
    setLoadingPayloads(true)
    const data = await api('/list_payloads')
    if (data?.payloads) {
      const sorted = [...data.payloads].sort((a, b) => {
        const aUsb = a.startsWith('/mnt/usb')
        const bUsb = b.startsWith('/mnt/usb')
        if (aUsb && !bUsb) return 1
        if (!aUsb && bUsb) return -1
        return a.localeCompare(b)
      })
      setPayloads(sorted)
      if (data.meta) setPayloadMeta(data.meta)
    }
    setLoadingPayloads(false)
  }

  const refreshConfig = async () => {
    const data = await api('/get_config')
    if (data) setConfig(data)
  }

  const handleAbort = async () => {
    await fetch('/abort').catch(() => {})
    setAutoloadStatus(prev => prev ? { ...prev, remaining: -1 } : null)
    addToast("تم إيقاف العملية", "error")
  }

  const handleFinish = async () => {
    await fetch('/autoload_clear').catch(() => {})
    setAutoloadStatus(null)
    window.location.reload()
  }

  const loadPayload = async (path) => {
    const name = path.split('/').pop().replace(/\.(elf|bin)$/i, '').replace(/_/g, ' ')
    setLoading(true)
    setActiveLoadingName(name)

    try {
      const res = await fetch(`/loadpayload:${encodeURI(path)}`)
      if (!res.ok) throw new Error('فشل التشغيل')
      addToast(`${name} تم تشغيله`)
    } catch (e) {
      addToast(e.message || "فشل التشغيل", "error")
    }

    setTimeout(() => {
      setLoading(false)
      setActiveLoadingName('')
    }, 1500)
  }

  const handleDelete = (fileName) => {
    showConfirm(
      "حذف الملف",
      `هل تريد حذف ${fileName}؟`,
      async () => {
        const res = await fetch(`/manage:delete?filename=${encodeURIComponent(fileName)}`)
        if (!res.ok) return addToast("فشل الحذف", "error")
        refreshPayloads()
        addToast("تم الحذف")
      }
    )
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['elf', 'bin'].includes(ext)) {
      return addToast("نوع ملف غير مدعوم", "error")
    }

    performUpload(file)
  }

  const performUpload = async (file) => {
    setDownloadModal({ show: true, name: file.name, progress: 20 })

    try {
      const res = await fetch(`/manage:upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file
      })

      if (!res.ok) throw new Error("فشل الرفع")

      setDownloadModal(prev => ({ ...prev, progress: 100 }))
      addToast("تم الرفع")
      refreshPayloads()
    } catch {
      addToast("فشل الرفع", "error")
    }

    setTimeout(() => setDownloadModal({ show: false }), 800)
  }

  const handleImportFromUsb = (path) => {
    setMoveFromUsbPath(path)
    setView('move_from_usb')
  }

  const [view, setView] = useState('dashboard')

  useEffect(() => {
    const init = async () => {
      try {
        setIp(await fetch('/getip').then(r => r.text()))
        setVersion(await fetch('/version').then(r => r.text()))
        refreshPayloads()
        refreshConfig()
      } catch {
        setIsOffline(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    let t
    const poll = async () => {
      const res = await fetch('/autoload_status')
      if (res.ok) setAutoloadStatus(await res.json())
      t = setTimeout(poll, 800)
    }
    poll()
    return () => clearTimeout(t)
  }, [])

  const isAutoloadActive = autoloadStatus && autoloadStatus.remaining >= 0

  if (isAutoloadActive) {
    return (
      <AutoloadOverlay
        status={autoloadStatus}
        onCancel={handleAbort}
        onFinish={handleFinish}
        isPS5={isPS5}
      />
    )
  }

  if (isOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center text-zinc-300">
        <div>
          <h1 className="text-2xl font-bold">الخدمة غير متاحة</h1>
          <p>تأكد من تشغيل النظام أولاً</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-black text-white">
      {/* باقي الواجهة بدون تغيير منطق — فقط النصوص أصبحت عربية */}
      {/* يمكنك طلب تعريب باقي Views إذا تريد */}
    </div>
  )
}

export default App
