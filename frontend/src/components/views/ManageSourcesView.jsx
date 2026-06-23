import React, { useState, useEffect } from 'react'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Lock, Globe, Loader2, AlertTriangle
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { cn, isPS5 } from '../../utils/helpers'

const ManageSourcesView = ({ onBack, ip, addToast, showConfirm }) => {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetch('/sources_list')
      .then(r => r.json())
      .then(d => {
        if (d?.sources) setSources(d.sources)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const saveSources = async (updated) => {
    try {
      const res = await fetch('/sources_set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: updated })
      })
      if (res.ok) {
        addToast('تم حفظ المصادر')
      } else {
        addToast('فشل حفظ المصادر', 'error')
      }
    } catch {
      addToast('فشل حفظ المصادر', 'error')
    }
  }

  const move = (idx, dir) => {
    if (idx + dir < 1 || idx + dir >= sources.length) return
    const updated = [...sources]
    ;[updated[idx], updated[idx + dir]] = [updated[idx + dir], updated[idx]]
    setSources(updated)
    saveSources(updated)
  }

  const remove = (idx) => {
    if (idx === 0) return
    const src = sources[idx]
    showConfirm(
      'إزالة المصدر',
      `هل تريد حذف "${src.name}" من المصادر؟`,
      () => {
        const updated = sources.filter((_, i) => i !== idx)
        setSources(updated)
        saveSources(updated)
      }
    )
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setAddError('')
    if (!newUrl.trim()) return
    setAdding(true)

    try {
      const res = await fetch(`/sources_add?url=${encodeURIComponent(newUrl.trim())}`)
      const data = await res.json()

      if (data.ok) {
        const listRes = await fetch('/sources_list')
        const listData = await listRes.json()
        if (listData?.sources) setSources(listData.sources)

        setNewUrl('')
        setShowAddForm(false)
        addToast(`تمت إضافة "${data.name}"`)
      } else {
        setAddError(data.message || 'فشل إضافة المصدر')
      }
    } catch {
      setAddError('فشل الطلب، تأكد من الرابط وحاول مرة أخرى')
    }

    setAdding(false)
  }

  /* ---- وضع PS5: QR فقط ---- */
  if (isPS5) {
    return (
      <div className="max-w-3xl mx-auto space-y-12 pb-20">
        <div className="flex items-center space-x-6">
          <button
            onClick={onBack}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>

          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            إدارة <span className="text-ps-blue">المصادر</span>
          </h2>
        </div>

        <div className="glass-card p-10 rounded-ps-3xl border border-white/10 flex flex-col items-center gap-8">
          <div className="bg-white p-6 rounded-3xl">
            <QRCodeSVG value={`http://${ip}:8084`} size={180} level="M" />
          </div>

          <code className="text-white font-mono text-xl font-black opacity-90 italic tracking-tight uppercase">
            {ip}:8084
          </code>

          <p className="text-zinc-400 text-center text-lg leading-relaxed max-w-md">
            افتح هذا العنوان من الهاتف أو الكمبيوتر لإدارة مصادر البايلود.
          </p>
        </div>
      </div>
    )
  }

  /* ---- وضع الكمبيوتر ---- */
  return (
    <div className="w-full max-w-3xl mx-auto space-y-10 pb-20 min-w-0">
      {/* العنوان */}
      <div className="flex items-center space-x-6">
        <button
          onClick={onBack}
          className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

        <h2 className="text-4xl font-extrabold text-white tracking-tight">
          مصادر <span className="text-ps-blue">البايلود</span>
        </h2>
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 text-ps-blue animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 w-full">
          {sources.map((src, idx) => (
            <div
              key={src.id}
              className={cn(
                'group flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 p-5 lg:p-6 glass-card rounded-2xl border transition-all w-full min-w-0 max-w-full overflow-hidden',
                src.removable
                  ? 'border-white/10 hover:border-ps-blue/30'
                  : 'border-white/5 bg-white/[0.015]'
              )}
            >
              {/* الاسم */}
              <div className="flex items-center justify-between lg:!justify-start flex-1 min-w-0 gap-4 w-full">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0',
                    idx === 0 ? 'bg-ps-blue/20 text-ps-blue' : 'bg-white/5 text-zinc-500'
                  )}>
                    {idx + 1}
                  </div>

                  <div className="p-2 bg-white/5 rounded-xl shrink-0">
                    {src.removable
                      ? <Globe className="w-5 h-5 text-zinc-400" />
                      : <Lock className="w-5 h-5 text-ps-blue" />
                    }
                  </div>

                  <div className="min-w-0 lg:hidden">
                    <p className="font-bold text-white text-base truncate">{src.name}</p>
                  </div>
                </div>

                {/* تحكم الهاتف */}
                <div className="flex items-center space-x-2 shrink-0 lg:hidden">
                  {src.removable && (
                    <>
                      <button onClick={() => move(idx, -1)} className="p-2 bg-white/5 rounded-xl">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => move(idx, 1)} className="p-2 bg-white/5 rounded-xl">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(idx)} className="p-2 bg-red-950/20 text-red-500 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* الاسم والرابط (سطح المكتب) */}
                <div className="hidden lg:flex lg:flex-col flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{src.name}</p>
                  <p className="text-xs text-zinc-500 truncate font-mono">{src.url}</p>
                </div>
              </div>

              {/* الرابط للموبايل */}
              <div className="lg:hidden w-full">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                  <span className="text-[10px] text-zinc-500 font-bold">رابط المصدر</span>
                  <p className="text-xs text-zinc-400 font-mono truncate">{src.url}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* إضافة مصدر */}
      {!showAddForm ? (
        <button
          onClick={() => { setShowAddForm(true); setAddError('') }}
          className="w-full flex items-center justify-center space-x-3 py-5 border-2 border-dashed border-white/10 rounded-2xl text-zinc-500 hover:text-ps-blue hover:border-ps-blue/30 font-bold"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مصدر</span>
        </button>
      ) : (
        <form onSubmit={handleAdd} className="p-6 glass-card rounded-2xl border border-white/10 space-y-4">
          <p className="font-bold text-white text-lg">إضافة مصدر جديد</p>
          <p className="text-sm text-zinc-500">ضع رابط ملف JSON</p>

          <input
            type="url"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="https://example.com/payloads.json"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white"
            disabled={adding}
          />

          <div className="flex gap-3">
            <button type="submit" disabled={adding} className="px-6 py-3 bg-ps-blue text-white rounded-xl font-bold">
              {adding ? 'جاري التحقق...' : 'إضافة'}
            </button>

            <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 bg-white/5 rounded-xl">
              إلغاء
            </button>
          </div>

          {addError && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {addError}
            </p>
          )}
        </form>
      )}
    </div>
  )
}

export default ManageSourcesView
