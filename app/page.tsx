"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileJson, Loader2, Terminal, Sparkles, Download, Eye, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { marked } from "marked"

export default function Home() {
  const [jsonContent, setJsonContent] = useState<any>(null)
  const [htmlResponse, setHtmlResponse] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/json": [".json"],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]
      setIsLoading(true)
      setError(null)

      try {
        // Read the file content
        const content = await readFileAsText(file)
        const parsedJson = JSON.parse(content)
        setJsonContent(parsedJson)

        // Simulate AI analysis (replace with actual API call)
        await analyzeJson(parsedJson)
      } catch (err: any) {
        setError(err.message || "Failed to process JSON file")
        setJsonContent(null)
        setHtmlResponse("")
      } finally {
        setIsLoading(false)
      }
    },
  })

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  const analyzeJson = async (json: any): Promise<void> => {
    setError(null)
    setHtmlResponse("")

    const dependencies = json.dependencies || {}
    const devDependencies = json.devDependencies || {}
    const allDeps = { ...dependencies, ...devDependencies }

    if (Object.keys(allDeps).length === 0) {
      setError("No dependencies found in package.json.")
      return
    }

    const res = await fetch("https://api.byteshrink.dev/api/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Model": "deepseek/deepseek-r1:free",
      },
      body: JSON.stringify({ dependencies, devDependencies }),
    })

    if (!res.ok || !res.body) {
      throw new Error("API call failed.")
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let aggregatedContent = ""
    let streamComplete = false
    let bufferedLine = ""

    const processLine = async (line: string) => {
      if (!line.startsWith("data: ")) return false
      const data = line.slice(6).trim()
      if (!data) return false
      if (data === "[DONE]") return true

      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          aggregatedContent += parsed.content
          const html = await marked.parse(aggregatedContent)
          setHtmlResponse(html)
        }
      } catch (parseError) {
        console.error("Failed to parse streaming chunk", parseError)
      }
      return false
    }

    while (!streamComplete) {
      const { value, done } = await reader.read()
      if (value) {
        bufferedLine += decoder.decode(value, { stream: true })
      }

      const lines = bufferedLine.split("\n\n")
      bufferedLine = lines.pop() || ""

      for (const line of lines) {
        const shouldStop = await processLine(line)
        if (shouldStop) {
          streamComplete = true
          break
        }
      }

      if (done || streamComplete) {
        if (!streamComplete && bufferedLine) {
          streamComplete = await processLine(bufferedLine)
          bufferedLine = ""
        }
        break
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <main className="relative flex min-h-screen flex-col items-center p-4 md:p-8">
        <header className="w-full max-w-5xl mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <FileJson className="h-10 w-10 text-purple-400" />
                <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  ByteShrink
                </h1>
                <p className="text-sm text-purple-300">Powered by AI</p>
              </div>
            </div>
            {/*<!--
            <Button
              variant="outline"
              className="border-purple-400 text-purple-300 hover:bg-purple-400 hover:text-white transition-all duration-300"
            >
              About
            </Button>
            -->*/}
          </div>
          <p className="mt-4 text-gray-300 text-lg">
              <strong>Drop in your <code>package.json</code>.</strong> Get back AI-powered insights on performance-critical dependencies, over-bundled modules, and smarter package choices.<br />
              Prefer automation? Use the CLI for seamless integration into your workflow.
</p>
        </header>

        {/* CLI Info Card */}
        <Card className="w-full max-w-5xl p-6 mb-8 bg-gradient-to-r from-purple-900/70 to-pink-900/70 backdrop-blur-sm border-purple-500/30 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                CLI Tool Available
                <span className="px-2 py-1 text-xs bg-gradient-to-r from-green-400 to-blue-400 text-white rounded-full">
                  NEW
                </span>
              </h2>
              <p className="mt-2 text-gray-100">You can also use ByteShrink directly from your terminal:</p>
              <div className="mt-4 p-4 bg-black/50 rounded-lg border border-purple-500/30 backdrop-blur-sm group hover:border-purple-400/50 transition-all duration-300">
                <code className="text-green-400 font-mono text-sm">npx @byteshrink/cli ./package.json</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-4 text-purple-300 hover:text-white hover:bg-purple-500/20"
                  onClick={() => navigator.clipboard.writeText("npx @byteshrink/cli ./package.json")}
                >
                  Copy
                </Button>
              </div>
              <p className="mt-3 text-sm text-gray-200">
                Run this command in your project root to analyze your <code>package.json</code> file.
              </p>
            </div>
          </div>
        </Card>

        <div className="w-full max-w-5xl space-y-8">
          {/* Drag and Drop Zone */}
          <Card
            className={`p-8 border-2 transition-all duration-500 backdrop-blur-sm ${
              isDragActive
                ? "border-purple-400 bg-purple-500/20 shadow-2xl shadow-purple-500/25 scale-105"
                : "border-dashed border-purple-500/50 bg-white/5 hover:bg-white/10 hover:border-purple-400/70"
            }`}
          >
            <div
              {...getRootProps()}
              className="flex flex-col items-center justify-center h-72 rounded-xl cursor-pointer group"
            >
              <input {...getInputProps()} />
              <div
                className={`relative mb-6 transition-all duration-300 ${isDragActive ? "scale-110" : "group-hover:scale-105"}`}
              >
                <Upload
                  className={`h-16 w-16 ${isDragActive ? "text-purple-400" : "text-gray-400 group-hover:text-purple-400"} transition-colors duration-300`}
                />
                {isDragActive && (
                  <div className="absolute inset-0 animate-ping">
                    <Upload className="h-16 w-16 text-purple-400 opacity-75" />
                  </div>
                )}
              </div>
              {isDragActive ? (
                <div className="text-center">
                  <p className="text-2xl font-semibold text-purple-300 mb-2">Drop <code>package.json</code> file here</p>
                  <p className="text-purple-400">Release to analyze</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    Drag & drop your <code>package.json</code> file here
                  </p>
                  <p className="text-gray-400 group-hover:text-purple-400 transition-colors">
                    or click to select a file
                  </p>
                  <div className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Choose File
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Results Section - Always visible under upload */}
          <div className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <Card className="p-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm border-purple-500/30 animate-pulse">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative mb-6">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
                    <div className="absolute inset-0 animate-ping">
                      <Loader2 className="h-12 w-12 text-purple-400 opacity-30" />
                    </div>
                  </div>
                  <p className="text-xl text-white mb-2">Analyzing your <code>package.json</code> file...</p>
                  <p className="text-purple-300">AI is processing your data</p>
                  <div className="mt-4 w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </Card>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <Card className="p-6 bg-gradient-to-r from-red-900/30 to-pink-900/30 backdrop-blur-sm border-red-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <FileJson className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-300">Analysis Failed</h3>
                </div>
                <p className="text-red-300 mb-4">{error}</p>
                <Button
                  variant="outline"
                  className="border-red-400 text-red-300 hover:bg-red-400 hover:text-white transition-all duration-300"
                  onClick={() => setError(null)}
                >
                  Try Again
                </Button>
              </Card>
            )}

            {/* Results Display */}
            {htmlResponse && !error && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Analysis Results
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    onClick={() => {
                      const blob = new Blob([htmlResponse], { type: "text/html" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = "byteshrink-analysis.html"
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>

                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black/30 backdrop-blur-sm border border-purple-500/30">
                    <TabsTrigger
                      value="preview"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-gray-300 transition-all duration-300"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger
                      value="source"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-gray-300 transition-all duration-300"
                    >
                      <Code className="h-4 w-4 mr-2" />
                      HTML Source
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="mt-6">
                    <Card className="p-8 bg-white/95 backdrop-blur-sm border-purple-500/30 shadow-2xl min-h-[300px]">
                      <div dangerouslySetInnerHTML={{ __html: htmlResponse }} className="prose prose-base max-w-none" />
                    </Card>
                  </TabsContent>

                  <TabsContent value="source" className="mt-6">
                    <Card className="p-6 bg-black/50 backdrop-blur-sm border-purple-500/30 overflow-auto min-h-[300px]">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-green-400 text-sm font-mono">HTML Output</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-purple-300 hover:text-white hover:bg-purple-500/20"
                          onClick={() => navigator.clipboard.writeText(htmlResponse)}
                        >
                          Copy HTML
                        </Button>
                      </div>
                      <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {htmlResponse}
                      </pre>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Empty State - Show when no file has been uploaded */}
            {!htmlResponse && !isLoading && !error && (
              <Card className="p-12 bg-white/5 backdrop-blur-sm border-dashed border-purple-500/30 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-purple-500/10">
                    <FileJson className="h-8 w-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Ready to Analyze</h3>
                    <p className="text-gray-400">Upload a JSON file above to see the AI analysis results here</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
        {/* Footer */}
        <footer className="w-full max-w-5xl mt-16 pt-8 border-t border-purple-500/20">
          <div className="space-y-6">
            {/* Privacy and Data Notice */}
            <Card className="p-6 bg-slate-800/90 backdrop-blur-sm border-purple-400/50 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-purple-500/40">
                  <FileJson className="h-5 w-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Privacy & Data Usage</h3>
                  <div className="space-y-2 text-gray-100">
                    <p>📦 For <code>package.json</code> files, we only read the <code>dependencies</code> and <code>devDependencies</code> fields.</p>
                    <p>🛡️ Your data remains private and secure throughout the analysis process. Nothing is stored.</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Links and Attribution */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
              <div className="flex items-center gap-6">
                <a
                  href="https://github.com/denodell/byteshrink-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors duration-300"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Contribute on GitHub
                </a>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">Open Source</span>
              </div>

              <div className="text-center">
                <p className="text-gray-400">
                  Built with <span className="text-red-400 animate-pulse">♥</span> by{" "}
                  <a
                    href="https://denodell.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-200 transition-colors duration-300 font-medium"
                  >
                    Den Odell
                  </a>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
