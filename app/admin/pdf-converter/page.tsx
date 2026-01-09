'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface ConversionResult {
  success: boolean
  totalPages?: number
  pagesProcessed?: string
  votersFound: number
  csv: string
  sample: Array<{
    serialNo: number
    voterId: string
    fullName: string
    relativeName: string
    age: string
    gender: string
  }>
}

export default function PDFConverterPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [mode, setMode] = useState<'paste' | 'upload'>('paste')
  const [pastedText, setPastedText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [fromPage, setFromPage] = useState(6)
  const [toPage, setToPage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [result, setResult] = useState<ConversionResult | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const res = await fetch('/api/auth/verify')
    if (!res.ok) {
      router.push('/login')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setMessage('Please select a PDF file')
      setMessageType('error')
      return
    }

    setFile(selectedFile)
    setResult(null)
    setMessage('Reading PDF...')
    setMessageType('info')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch('/api/admin/pdf-to-csv', {
        method: 'PUT',
        body: formData,
      })

      if (res.ok) {
        const info = await res.json()
        setTotalPages(info.totalPages)
        setFromPage(Math.min(6, info.totalPages))
        setToPage(info.totalPages)
        setMessage(`PDF loaded: ${info.totalPages} pages. Voter data usually starts from page 6.`)
        setMessageType('info')
      } else {
        setMessage('Failed to read PDF')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Error reading PDF:', error)
      setMessage('Error reading PDF file')
      setMessageType('error')
    }
  }

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (mode === 'paste') {
      if (!pastedText.trim()) {
        setMessage('Please paste the text from the PDF first')
        setMessageType('error')
        return
      }

      setLoading(true)
      setMessage('')
      setResult(null)

      try {
        const res = await fetch('/api/admin/pdf-to-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText }),
        })

        const data = await res.json()

        if (res.ok && data.success) {
          setResult(data)
          setMessage(`Successfully extracted ${data.votersFound} voters!`)
          setMessageType('success')
        } else {
          setMessage(data.error || 'Conversion failed')
          setMessageType('error')
        }
      } catch (error) {
        console.error('Conversion error:', error)
        setMessage('Error converting text')
        setMessageType('error')
      } finally {
        setLoading(false)
      }
      return
    }
    
    // Upload mode
    if (!file) {
      setMessage('Please select a PDF file first')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fromPage', fromPage.toString())
      formData.append('toPage', toPage.toString())

      const res = await fetch('/api/admin/pdf-to-csv', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResult(data)
        setMessage(`Successfully extracted ${data.votersFound} voters!`)
        setMessageType('success')
      } else {
        setMessage(data.error || 'Conversion failed - try Paste Text mode instead')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Conversion error:', error)
      setMessage('Error converting PDF')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = () => {
    if (!result?.csv) return

    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `voters_${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setFile(null)
    setPastedText('')
    setResult(null)
    setMessage('')
    setTotalPages(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/admin" className="text-2xl font-bold text-white">
              Election Admin Panel
            </Link>
            <Link href="/admin" className="text-slate-300 hover:text-white transition">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">📄 Voter PDF to CSV Converter</h2>
          <p className="text-slate-400">Convert voter list PDF to CSV format for importing into the app</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex space-x-2 mb-6">

          <button
            type="button"
            onClick={() => setMode('paste')}
            className={`flex-1 py-3 rounded-xl font-medium transition ${
              mode === 'paste' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📋 Paste Text (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex-1 py-3 rounded-xl font-medium transition ${
              mode === 'upload' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📄 Upload PDF
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
          <form onSubmit={handleConvert} className="space-y-6">
            
            {/* Paste Text Mode */}
            {mode === 'paste' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Paste Voter List Text</label>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
                  <p className="text-amber-300 text-sm">
                    <strong>How to use:</strong> Open the PDF in your browser/PDF viewer → Select all text (Ctrl+A) → Copy (Ctrl+C) → Paste below (Ctrl+V)
                  </p>
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Paste the copied text from PDF here...

Example format:
29,094       MZB1824747    230/8/378
मतदाराचे पूर्ण नाव:कोळेकर जालींदर विनायक
वडिलांचे नाव :कोळेकर विनायक
घर क्रमांक : २८
वय :४१ लिंग :पु`}
                  className="w-full h-64 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {pastedText ? `${pastedText.length.toLocaleString()} characters pasted` : 'No text pasted yet'}
                </p>
              </div>
            )}

            {/* Upload Mode */}
            {mode === 'upload' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select PDF File</label>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                  <p className="text-red-300 text-sm">
                    ⚠️ <strong>Note:</strong> Direct PDF upload may not work due to font encoding. Use Paste Text mode for best results.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white"
                />
                {totalPages > 0 && (
                  <div className="mt-4 bg-slate-700/30 rounded-xl p-4">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Page Range (Total: {totalPages} pages)
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">From</label>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={fromPage}
                          onChange={(e) => setFromPage(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
                        />
                      </div>
                      <span className="text-slate-400 pt-5">to</span>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">To</label>
                        <input
                          type="number"
                          min={fromPage}
                          max={totalPages}
                          value={toPage}
                          onChange={(e) => setToPage(parseInt(e.target.value) || fromPage)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-xl ${
                messageType === 'success' ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300' :
                messageType === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-300' :
                'bg-blue-500/20 border border-blue-500/50 text-blue-300'
              }`}>
                {message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading || (mode === 'paste' ? !pastedText.trim() : !file)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? '⏳ Converting...' : '🔄 Convert to CSV'}
              </button>
              {(pastedText || file || result) && (
                <button type="button" onClick={resetForm} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl">
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">✅ Conversion Complete</h3>
              <button
                onClick={downloadCSV}
                className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium transition"
              >
                <span>⬇️ Download CSV</span>
              </button>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4 mb-6 text-center">
              <div className="text-3xl font-bold text-orange-400">{result.votersFound}</div>
              <div className="text-slate-400 text-sm">Voters Found</div>
            </div>

            {result.sample && result.sample.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3">Preview (First 3 records)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2 px-3">Serial</th>
                        <th className="text-left py-2 px-3">Voter ID</th>
                        <th className="text-left py-2 px-3">Name</th>
                        <th className="text-left py-2 px-3">Relative</th>
                        <th className="text-left py-2 px-3">Age</th>
                        <th className="text-left py-2 px-3">Gender</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sample.map((voter, idx) => (
                        <tr key={idx} className="text-slate-300 border-b border-slate-700/50">
                          <td className="py-2 px-3">{voter.serialNo}</td>
                          <td className="py-2 px-3 font-mono text-xs">{voter.voterId}</td>
                          <td className="py-2 px-3">{voter.fullName}</td>
                          <td className="py-2 px-3">{voter.relativeName}</td>
                          <td className="py-2 px-3">{voter.age}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              voter.gender === 'M' ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'
                            }`}>
                              {voter.gender === 'M' ? 'Male' : 'Female'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help */}
        <div className="mt-8 bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">📋 Expected Format</h3>
          <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-xs text-slate-300">
            <pre>{`29,094       MZB1824747    230/8/378
मतदाराचे पूर्ण नाव: कोळेकर जालींदर विनायक
वडिलांचे नाव: कोळेकर विनायक
घर क्रमांक: २८
वय: ४१   लिंग: पु`}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
