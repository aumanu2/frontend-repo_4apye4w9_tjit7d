import { useEffect, useMemo, useState } from 'react'

function classNames(...c) { return c.filter(Boolean).join(' ') }

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const [uploading, setUploading] = useState(false)
  const [dataset, setDataset] = useState(null) // {id, name, columns, column_types, row_count}
  const [preview, setPreview] = useState([])
  const [datasets, setDatasets] = useState([])
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(100)

  useEffect(() => {
    fetchDatasets()
  }, [])

  const fetchDatasets = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/datasets`)
      const data = await res.json()
      setDatasets(data.datasets || [])
    } catch (e) {
      // ignore
    }
  }

  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${baseUrl}/api/upload`, { method: 'POST', body: form })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'Upload failed')
      }
      const data = await res.json()
      setDataset({
        id: data.dataset_id,
        name: data.name,
        columns: data.columns,
        column_types: data.column_types,
        row_count: data.row_count,
      })
      setPreview(data.preview || [])
      setRows(data.preview || [])
      setQuery('')
      fetchDatasets()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const runQuery = async () => {
    if (!dataset?.id) return
    setLoadingRows(true)
    setError('')
    try {
      const res = await fetch(`${baseUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: dataset.id, query, limit })
      })
      if (!res.ok) throw new Error('Query failed')
      const data = await res.json()
      setRows(data.rows || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingRows(false)
    }
  }

  const loadExisting = async (id) => {
    const found = datasets.find(d => d._id === id)
    if (!found) return
    setDataset({ id, name: found.name, columns: found.columns, column_types: {}, row_count: found.row_count })
    setPreview([])
    setRows([])
    setQuery('')
  }

  const columns = useMemo(() => dataset?.columns || (preview[0] ? Object.keys(preview[0]) : []), [dataset, preview])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50">
      <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500"></div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">AI Table Studio</h1>
              <p className="text-xs text-gray-500">Upload data • Ask in plain English • Explore</p>
            </div>
          </div>

          <label className={classNames(
            'relative cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md text-white',
            uploading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
          )}>
            <input type="file" accept=".csv" onChange={onUpload} className="hidden" />
            <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Upload CSV'}</span>
          </label>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Datasets List */}
        {datasets?.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">Your datasets</h2>
              <button
                onClick={fetchDatasets}
                className="text-xs text-indigo-600 hover:underline"
              >Refresh</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {datasets.map(d => (
                <button
                  key={d._id}
                  onClick={() => loadExisting(d._id)}
                  className={classNames(
                    'px-3 py-2 rounded-md text-sm border',
                    dataset?.id === d._id ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                  )}
                  title={`${d.row_count || 0} rows`}
                >{d.name}</button>
              ))}
            </div>
          </div>
        )}

        {/* Current Dataset Info */}
        {dataset ? (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">{dataset.name}</h2>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">{dataset.row_count} rows</span>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">{columns.length} columns</span>
            </div>
            {Object.keys(dataset.column_types || {}).length > 0 && (
              <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                {Object.entries(dataset.column_types).map(([c,t]) => (
                  <span key={c} className="px-2 py-1 bg-gray-100 rounded">{c}: {t}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-8 p-6 rounded-xl border border-dashed bg-white">
            <h2 className="font-semibold text-gray-800 mb-2">Get started</h2>
            <p className="text-sm text-gray-600">Upload a CSV to create an interactive table. You can then filter with natural language like:</p>
            <ul className="text-sm text-gray-600 list-disc ml-5 mt-2 space-y-1">
              <li>price > 100</li>
              <li>country = US and status is true</li>
              <li>contains name John</li>
            </ul>
          </div>
        )}

        {/* Query Bar */}
        {dataset && (
          <div className="mb-4 flex flex-col md:flex-row gap-3 items-stretch">
            <input
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ask something like: price > 100 and country = US or use 'contains name John'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={1000}
                value={limit}
                onChange={(e)=> setLimit(parseInt(e.target.value || '100', 10))}
                className="w-28 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Max rows"
              />
              <button
                onClick={runQuery}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >Run</button>
            </div>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
        )}

        {/* Table */}
        {dataset && (
          <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="text-left px-3 py-2 font-semibold text-gray-700 border-b">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(loadingRows ? [] : rows).map((r, idx) => (
                  <tr key={idx} className={classNames(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50', 'hover:bg-indigo-50/40')}>
                    {columns.map(c => (
                      <td key={c} className="px-3 py-2 border-b align-top text-gray-700">{String(r?.[c] ?? '')}</td>
                    ))}
                  </tr>
                ))}
                {loadingRows && (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={columns.length}>Loading…</td></tr>
                )}
                {!loadingRows && rows.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={columns.length}>No rows to display</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Preview note */}
        {dataset && preview.length > 0 && rows.length === preview.length && (
          <p className="mt-3 text-xs text-gray-500">Showing preview rows. Use the query box and Run to fetch filtered data.</p>
        )}
      </main>

      <footer className="py-8 text-center text-xs text-gray-500">
        Built with ❤️ for quick data exploration.
      </footer>
    </div>
  )
}

export default App
