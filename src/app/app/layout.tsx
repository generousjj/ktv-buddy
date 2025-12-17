import { Sidebar } from '@/components/Sidebar'
import { MobileHeader } from '@/components/MobileHeader'


export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <Sidebar />
            <main className="md:pl-64 min-h-screen pb-16 md:pb-0">
                <MobileHeader />
                {children}
            </main>
        </div>
    )
}
