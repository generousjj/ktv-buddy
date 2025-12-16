'use client'

import { saveSettings } from '@/app/actions'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
            {pending ? 'Saving...' : 'Save Settings'}
        </button>
    )
}

export function SettingsForm({ initialApiKey, initialModel }: { initialApiKey: string, initialModel: string }) {
    return (
        <form action={saveSettings} className="space-y-6 max-w-lg">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold text-white">OpenAI Configuration</h2>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">API Key</label>
                    <input
                        name="apiKey"
                        defaultValue={initialApiKey}
                        type="password"
                        placeholder="sk-..."
                        className="w-full bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Stored locally in your SQLite database.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Model</label>
                    <select
                        name="model"
                        defaultValue={initialModel}
                        className="w-full bg-zinc-800 border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="gpt-4o-mini">gpt-4o-mini (Unbeatable speed/cost)</option>
                        <option value="gpt-4o">gpt-4o (Smartest)</option>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                    </select>
                </div>
            </div>

            <SubmitButton />
        </form>
    )
}
