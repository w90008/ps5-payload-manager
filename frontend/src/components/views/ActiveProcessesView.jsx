import React, { useState, useEffect, useMemo } from 'react'
import { Cpu, RefreshCw, XCircle, Search, AlertCircle, Activity, Loader2, Info } from 'lucide-react'
import { cn, isPS5 } from '../../utils/helpers'

const ActiveProcessesView = ({ ip, addToast, showConfirm }) => {
  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')

  const fetchProcesses = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    if (!isBackground) setError(false)
    try {
      const res = await fetch('/processes_list')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProcesses(data?.processes || [])
    } catch {
      if (!isBackground) setError(true)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  useEffect(() => {
    fetchProcesses()

    const intervalId = setInterval(() => {
      fetchProcesses(true)
    }, 15000)

    return () => clearInterval(intervalId)
  }, [])

  const filteredProcesses = useMemo(() => {
    let result = processes

    if (!showAll) {
      result = result.filter(p => p.is_daemon)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }

    return result
  }, [processes, showAll, search])

  const handleKill = (p) => {
    if (p.name === 'pldmgr.elf' || p.name === 'elfldr.elf') {
      addToast(`لا يمكن إيقاف ${p.name}`, "error")
      return
    }

    showConfirm(
      "إيقاف العملية",
      `هل تريد إيقاف ${p.name} (PID: ${p.pid})؟`,
      async () => {
        try {
          const res = await fetch(`/process_kill?pid=${p.pid}`)
          if (res.ok) {
            addToast(`تم إيقاف ${p.name} بنجاح`)
            setTimeout(() => fetchProcesses(true), 500)
          } else {
            addToast(`فشل إيقاف ${p.name}`, "error")
          }
        } catch {
          addToast(`خطأ أثناء إيقاف ${p.name}`, "error")
        }
      }
    )
  }

  return (
    <div className="space-y-12">

      {/* العنوان */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <h2 className="text-4xl font-extrabold text-white tracking-tight">
          العمليات <span className="text-ps-blue">النشطة</span>
        </h2>

        <label className="flex items-center space-x-3 cursor-pointer group">
          <span className="text-zinc-400 font-bold group-hover:text-white transition-colors">
            عرض جميع عمليات النظام
          </span>

          <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/10">
            <input
              type="checkbox"
              className="sr-only"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                showAll ? "translate-x-6 bg-ps-blue" : "translate-x-1"
              )}
            />
          </div>
        </label>
      </div>

      {/* البحث */}
      <section className="space-y-6">

        <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
          <Search className="w-5 h-5 text-zinc-500 mr-3" />
          <input
            type="text"
            placeholder="ابحث عن عملية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-white w-full"
          />
        </div>

        {/* تحميل */}
        {loading && processes.length === 0 ? (
          <div className="py-24 text-center text-zinc-400">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-ps-blue" />
            <p className="mt-4">جارٍ جلب العمليات...</p>
          </div>

        ) : error ? (
          <div className="py-20 text-center text-red-400">
            <AlertCircle className="w-10 h-10 mx-auto" />
            <p className="mt-4">فشل تحميل قائمة العمليات</p>
          </div>

        ) : filteredProcesses.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <Activity className="w-10 h-10 mx-auto opacity-20" />
            <p className="mt-4">لا توجد عمليات</p>
          </div>

        ) : (
          <div className="grid gap-4">

            {filteredProcesses.map((p) => (
              <div key={p.pid} className="glass-card p-5 rounded-2xl flex justify-between items-center">

                {/* اسم العملية */}
                <div className="flex items-center space-x-4">
                  <Cpu className="w-6 h-6 text-ps-blue" />

                  <div>
                    <h3 className="text-white font-bold">{p.name}</h3>
                    <p className="text-xs text-zinc-500">
                      PID: {p.pid} | الذاكرة: {p.memory.toFixed(1)} MB
                    </p>
                  </div>
                </div>

                {/* زر الإيقاف */}
                {p.is_daemon && p.name !== 'pldmgr.elf' && p.name !== 'elfldr.elf' ? (
                  <button
                    onClick={() => handleKill(p)}
                    className="bg-red-600 text-white px-4 py-2 rounded-xl"
                  >
                    إيقاف
                  </button>
                ) : (
                  <span className="text-zinc-500 text-sm opacity-50">
                    غير قابل للإيقاف
                  </span>
                )}

              </div>
            ))}

          </div>
        )}

        {/* ملاحظة */}
        <div className="bg-ps-blue/10 border border-ps-blue/20 rounded-2xl p-4 text-sm text-ps-blue">
          <strong>ملاحظة:</strong> بعض العمليات التي يتم حقنها داخل النظام قد تبقى نشطة حتى بعد إيقاف العملية الرئيسية.
        </div>

      </section>
    </div>
  )
}

export default ActiveProcessesView
