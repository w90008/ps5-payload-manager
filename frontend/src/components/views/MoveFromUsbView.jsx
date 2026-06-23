import React, { useState, useEffect } from 'react'
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2, Info, Usb } from 'lucide-react'
import { cn } from '../../utils/helpers'

const MoveFromUsbView = ({ path, onBack, onComplete, addToast }) => {
  const [status, setStatus] = useState('loading')
  const [details, setDetails] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    checkPayload()
  }, [path])

  const checkPayload = async () => {
    setStatus('loading')
    try {
      const res = await fetch(`/usb_move_check?path=${encodeURIComponent(path)}`)
      const data = await res.json()

      if (data.error) {
        setErrorMsg(data.error)
        setStatus('error')
      } else {
        setDetails(data)

        if (data.status === 'exists_same') setStatus('exists_same')
        else if (data.status === 'exists_different' || data.folder_exists) setStatus('exists_different')
        else setStatus('confirm')
      }
    } catch {
      setErrorMsg('فشل الاتصال بالخادم')
      setStatus('error')
    }
  }

  const performMove = async (overwrite = false, keepOriginal = false) => {
    setStatus('processing')
    try {
      const res = await fetch(
        `/usb_move_perform?path=${encodeURIComponent(path)}&overwrite=${overwrite}&keep_original=${keepOriginal}`
      )
      const data = await res.json()

      if (data.error) {
        setErrorMsg(data.error)
        setStatus('error')
      } else {
        setStatus('success')

        addToast(
          data.warning ||
            (keepOriginal ? 'تم نسخ البايلود إلى الذاكرة الداخلية' : 'تم نقل البايلود إلى الذاكرة الداخلية')
        )

        setTimeout(() => {
          onComplete()
        }, 2000)
      }
    } catch {
      setErrorMsg('فشلت العملية')
      setStatus('error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <button
        onClick={onBack}
        className="flex items-center space-x-3 text-zinc-500 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold uppercase tracking-widest text-sm">رجوع</span>
      </button>

      <div className="space-y-4">
        <h2 className="text-4xl font-extrabold text-white tracking-tight">
          استيراد إلى <span className="text-ps-blue">الذاكرة الداخلية</span>
        </h2>

        <p className="text-zinc-500 max-w-2xl">
          سيتم نقل البايلود المحدد من USB إلى التخزين الداخلي للجهاز.
        </p>
      </div>

      <div className="glass-card p-6 md:p-10 rounded-ps-3xl border-white/10 bg-white/[0.02] space-y-10">
        {/* المصدر */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-8 text-center sm:text-left">
          <div className="p-4 md:p-6 bg-ps-blue/20 rounded-3xl border border-ps-blue/30 shrink-0">
            <Usb className="w-8 h-8 md:w-10 md:h-10 text-ps-blue" />
          </div>

          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-ps-blue uppercase text-xs font-bold tracking-widest">المسار المصدر</p>
            <p className="text-xl md:text-2xl font-black text-white italic truncate w-full">
              {path}
            </p>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* تحميل */}
        {status === 'loading' && (
          <div className="py-12 flex flex-col items-center space-y-6">
            <Loader2 className="w-12 h-12 text-ps-blue animate-spin" />
            <p className="text-zinc-500 uppercase tracking-widest text-sm">جاري فحص التخزين الداخلي...</p>
          </div>
        )}

        {/* خطأ */}
        {status === 'error' && (
          <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="space-y-2">
              <p className="text-lg font-bold text-white">حدث خطأ</p>
              <p className="text-red-400">{errorMsg}</p>

              <button
                onClick={checkPayload}
                className="mt-4 px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-sm"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        {/* موجود نفس الملف */}
        {status === 'exists_same' && (
          <div className="space-y-8">
            <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row gap-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />

              <div className="space-y-2">
                <p className="text-lg font-bold text-white">الملف موجود بالفعل</p>
                <p className="text-emerald-400">
                  نفس البايلود موجود في النظام (SHA256: {details?.sha256?.substring(0, 12)}...)
                </p>
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase"
            >
              العودة
            </button>
          </div>
        )}

        {/* إصدار مختلف */}
        {status === 'exists_different' && (
          <div className="space-y-8">
            <div className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row gap-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />

              <div className="space-y-2">
                <p className="text-lg font-bold text-white">إصدار موجود مسبقاً</p>
                <p className="text-amber-400">
                  يوجد إصدار آخر من هذا البايلود، هل تريد استبداله؟
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={onBack} className="flex-1 py-5 bg-white/5 rounded-2xl">
                إلغاء
              </button>

              <button onClick={() => performMove(true, true)} className="flex-1 py-5 bg-ps-blue/60 rounded-2xl">
                نسخ واستبدال
              </button>

              <button onClick={() => performMove(true, false)} className="flex-1 py-5 bg-ps-blue rounded-2xl">
                نقل واستبدال
              </button>
            </div>
          </div>
        )}

        {/* تأكيد */}
        {status === 'confirm' && (
          <div className="space-y-8">
            <div className="p-8 bg-ps-blue/10 border border-ps-blue/20 rounded-2xl flex flex-col md:flex-row gap-4">
              <Info className="w-8 h-8 text-ps-blue" />

              <div className="space-y-2">
                <p className="text-lg font-bold text-white">جاهز للنقل</p>
                <p className="text-zinc-400">
                  يمكنك نسخ البايلود أو نقله مباشرة إلى التخزين الداخلي.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => performMove(false, true)} className="flex-1 py-5 bg-white/10 rounded-2xl">
                نسخ
              </button>

              <button onClick={() => performMove(false, false)} className="flex-1 py-5 bg-ps-blue rounded-2xl">
                نقل
              </button>
            </div>
          </div>
        )}

        {/* جاري التنفيذ */}
        {status === 'processing' && (
          <div className="py-20 flex flex-col items-center space-y-6">
            <Loader2 className="w-12 h-12 text-ps-blue animate-spin" />
            <p className="text-xl font-bold text-white uppercase">جاري النقل...</p>
          </div>
        )}

        {/* نجاح */}
        {status === 'success' && (
          <div className="py-20 flex flex-col items-center space-y-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <p className="text-2xl font-black text-white">تم بنجاح</p>
            <p className="text-zinc-500">تم نقل البايلود إلى التخزين الداخلي.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MoveFromUsbView
