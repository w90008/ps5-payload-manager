import React, { useState, useEffect, useMemo } from 'react'
import {
  CloudDownload, Upload, Package, Database, RefreshCw,
  Trash2, Loader2, AlertTriangle, HardDrive, Usb,
  ChevronDown, Globe
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { cn, isPS5, isIOS, parsePayloadName } from '../../utils/helpers'
import PayloadName from '../ui/PayloadName'

const StorageHub = ({
  payloads,
  payloadMeta,
  onInstall,
  onDelete,
  onUpload,
  onImportFromUsb,
  config,
  ip,
  scrollTarget,
  onClearScrollTarget
}) => {

  const multiSources = config?.MULTI_SOURCES_ENABLED === true

  const [repoData, setRepoData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [expandedSource, setExpandedSource] = useState(null)

  const fetchRemote = async (force = false) => {
    setLoading(true)
    setError(false)
    try {
      const endpoint = force ? '/repository_refresh' : '/repository_payloads'
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRepoData(data)

      if (data?.sources?.length > 0 && expandedSource === null) {
        const first = data.sources.find(s => s.payloads?.length > 0)
        if (first) setExpandedSource(first.id)
      }

      if (!force && data?.last_update) {
        const now = Math.floor(Date.now() / 1000)
        if (now - Number(data.last_update) > 24 * 60 * 60) {
          await fetchRemote(true)
          return
        }
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRemote() }, [])

  useEffect(() => {
    if (scrollTarget) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTarget)
        if (element) element.scrollIntoView({ behavior: 'smooth' })
        if (onClearScrollTarget) onClearScrollTarget()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [scrollTarget])

  const localFilenames = useMemo(
    () => payloads.map(p => p.split('/').pop()),
    [payloads]
  )

  const internalPayloads = payloads.filter(p => !p.includes('/mnt/usb'))

  const getBaseName = (filename) => {
    if (!filename) return ''
    let clean = filename.replace(/\.(elf|bin)$/i, '')
    const versionMatch = clean.match(/[_-]v?(\d+[\d.a-z-]+)/i)
    if (versionMatch) clean = clean.replace(versionMatch[0], '')
    return clean.replace(/[_-]ps[45]$/i, '')
  }

  const enrichPayloads = (list) =>
    list.map(p => {
      const isInstalled = p.filename ? localFilenames.includes(p.filename) : false
      const baseName = getBaseName(p.filename)
      const installedVersion = localFilenames.find(f => getBaseName(f) === baseName)
      const isUpdate = !isInstalled && !!installedVersion
      return { ...p, isInstalled, isUpdate, installedFilename: installedVersion }
    }).sort((a, b) => {
      if (a.isUpdate && !b.isUpdate) return -1
      if (!a.isUpdate && b.isUpdate) return 1

      const nameA = (a.name || a.filename || '').toLowerCase()
      const nameB = (b.name || b.filename || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })

  const enrichedSources = useMemo(() => {
    if (multiSources && repoData?.sources) {
      return repoData.sources.map(src => ({
        ...src,
        id: src.id || src.url,
        payloads: enrichPayloads(src.payloads || [])
      }))
    } else if (!multiSources && repoData?.payloads) {
      return [{
        id: 'legacy-repo',
        name: 'المستودع الافتراضي',
        url: repoData.repo_url || '',
        last_update: repoData.last_update || 0,
        payloads: enrichPayloads(repoData.payloads)
      }]
    }
    return []
  }, [repoData, multiSources, localFilenames])

  const getSourceBadge = (fileName) => {
    if (!multiSources || !payloadMeta) return null
    const meta = payloadMeta[fileName]
    return meta?.source_name || meta?.install_source_detail || null
  }

  return (
    <div className="space-y-12">

      {/* العنوان */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <h2 className="text-4xl font-extrabold text-white tracking-tight">
          إدارة <span className="text-ps-blue">الحزم</span>
        </h2>

        {!isPS5 && (
          <label className="inline-flex items-center space-x-4 px-10 py-5 bg-ps-blue hover:bg-ps-blue/80 text-white rounded-[1.25rem] font-bold tracking-tight text-xl cursor-pointer transition-all">
            <Upload className="w-7 h-7" />
            <span>رفع ملف ELF</span>
            <input type="file" className="hidden" onChange={onUpload} />
          </label>
        )}
      </div>

      {/* الحزم المثبتة */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="label-caps !text-white flex items-center space-x-4 text-lg">
            <Database className="w-6 h-6 text-ps-blue" />
            <span>الحزم المثبتة</span>
          </h3>
          <span className="bg-white/5 px-4 py-1 rounded-full text-zinc-500 font-bold text-xs">
            {internalPayloads.length} ملف
          </span>
        </div>

        <div className={cn("grid gap-4", isPS5 ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-2")}>
          {internalPayloads.length === 0 ? (
            <div className="col-span-full py-20 border-2 border-dashed border-white/5 rounded-ps-3xl flex flex-col items-center justify-center space-y-4">
              <Package className="w-16 h-16 text-white/5" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm italic">
                لا توجد ملفات
              </p>
            </div>
          ) : (
            internalPayloads.map((path) => {
              const fileName = path.split('/').pop()
              const sourceBadge = getSourceBadge(fileName)

              return (
                <div key={path} className="group flex flex-col p-4 md:p-6 glass-card rounded-ps-2xl border-white/10 hover:border-ps-blue/30 gap-3">

                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div className="p-3 md:p-4 bg-white/5 rounded-2xl">
                        <Package className="w-6 h-6 md:w-8 md:h-8 text-zinc-400 group-hover:text-ps-blue" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <PayloadName path={fileName} className="text-xl md:text-2xl text-white" stacked />

                        {sourceBadge && (
                          <div className="flex items-center gap-1 text-zinc-500 text-[11px]">
                            <Globe className="w-3.5 h-3.5" />
                            <span>{sourceBadge}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDelete(fileName)}
                      className="p-3 md:p-4 rounded-xl bg-red-950/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              )
            })
          )}
        </div>
      </section>

      {/* المستودع السحابي */}
      <section className="space-y-6">

        <div className="flex items-center justify-between px-2">
          <h3 className="label-caps !text-white flex items-center space-x-4 text-lg">
            <CloudDownload className="w-6 h-6 text-ps-blue" />
            <span>المستودع السحابي</span>
          </h3>

          <button onClick={() => fetchRemote(true)} className="p-2 text-zinc-500 hover:text-ps-blue">
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>

        {loading && !repoData ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-6">
            <Loader2 className="w-16 h-16 text-ps-blue animate-spin" />
            <p className="text-zinc-500">جاري مزامنة البيانات...</p>
          </div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-red-500" />
            <p className="text-white font-bold">تعذر الاتصال بالمستودع</p>
          </div>
        ) : (
          <div className="space-y-4">
            {enrichedSources.map(src => (
              <div key={src.id} className="glass-card p-6 rounded-2xl border border-white/10">

                <div className="flex justify-between items-center">
                  <p className="font-bold text-white">{src.name}</p>
                  <span className="text-zinc-500 text-xs">
                    {src.payloads.length} ملف
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}

      </section>

      {/* USB */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="label-caps !text-ps-blue flex items-center space-x-4 text-lg">
            <HardDrive className="w-6 h-6" />
            <span>تخزين USB</span>
          </h3>
        </div>

        <div className="grid gap-4">
          {payloads.filter(p => p.includes('/mnt/usb')).length === 0 ? (
            <p className="text-zinc-500 text-center py-20">لا توجد ملفات على USB</p>
          ) : (
            payloads.filter(p => p.includes('/mnt/usb')).map(path => (
              <div key={path} className="flex items-center justify-between p-4 glass-card rounded-2xl">
                <div className="flex items-center space-x-4">
                  <Usb className="w-6 h-6 text-zinc-400" />
                  <PayloadName path={path} className="text-white" stacked />
                </div>

                <button
                  onClick={() => onImportFromUsb(path)}
                  className="px-4 py-2 bg-ps-blue text-white rounded-xl font-bold"
                >
                  نقل إلى الداخلي
                </button>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  )
}

export default StorageHub
