import Sidebar from '@/components/layout/Sidebar';
import PageTransition from '@/components/PageTransition';

export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-56 pt-14 lg:pt-0 pb-14 sm:pb-0 lg:pb-0">
        <div className="max-w-5xl mx-auto p-4 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
