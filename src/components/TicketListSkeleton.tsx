export default function TicketListSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-9 w-28 bg-gray-100 rounded-md animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 flex gap-4 items-start">
            <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
