import { NewSongForm } from '@/components/NewSongForm'

export default function NewSongPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Add New Song</h1>
            <NewSongForm />
        </div>
    )
}
