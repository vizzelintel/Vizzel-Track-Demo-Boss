import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DashboardStats {
  pendingRequests: number;
  activeLoans: number;
  overdueCount: number;
  totalAssets: number;
  recentActivity?: any[];
  monthlyStats?: any[];
}

interface DashboardViewProps {
  stats?: DashboardStats;
}

export function DashboardView({ stats }: DashboardViewProps) {
  // Default values if stats are undefined
  const data = stats || {
    pendingRequests: 0,
    activeLoans: 0,
    overdueCount: 0,
    totalAssets: 0,
  };

  const cards = [
    {
      title: "รออนุมัติ",
      value: data.pendingRequests,
      icon: Clock,
      description: "รายการคำขอใหม่ที่รอการตรวจสอบ",
      className: "text-orange-600",
      bgClass: "bg-orange-50",
    },
    {
      title: "กำลังยืม",
      value: data.activeLoans,
      icon: CheckCircle2,
      description: "สินทรัพย์ที่อยู่ระหว่างการยืม",
      className: "text-blue-600",
      bgClass: "bg-blue-50",
    },
    {
      title: "เกินกำหนดคืน",
      value: data.overdueCount,
      icon: AlertCircle,
      description: "รายการที่ยังไม่คืนตามกำหนด",
      className: "text-red-600",
      bgClass: "bg-red-50",
    },
    {
      title: "สินทรัพย์ทั้งหมด",
      value: data.totalAssets,
      icon: Package,
      description: "สินทรัพย์ทั้งหมดในระบบ",
      className: "text-slate-600",
      bgClass: "bg-slate-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgClass}`}>
                <card.icon className={`h-4 w-4 ${card.className}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-muted-foreground text-xs">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 h-full">
          <CardHeader>
            <CardTitle>ภาพรวมรายเดือน</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              {data.monthlyStats && data.monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.monthlyStats}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      cursor={{ fill: "transparent" }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "20px" }}
                      formatter={(value) => (
                        <span className="text-sm font-medium text-slate-700">
                          {value}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="borrow"
                      name="เบิก/ยืม"
                      fill="#3b82f6" // Blue-500
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="return"
                      name="คืน"
                      fill="#22c55e" // Green-500
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                    <p>ไม่มีข้อมูลสถิติสำหรับปีนี้</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3 h-full">
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
            <p className="text-sm text-muted-foreground">
              รายการอนุมัติล่าสุดในระบบ
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {data.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none line-clamp-1">
                        {activity.action}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          new Date(activity.timestamp),
                          "dd MMM yyyy HH:mm",
                          {
                            locale: th,
                          },
                        )}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-sm text-slate-500 line-clamp-1 max-w-[100px] text-right">
                      {activity.user}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  ยังไม่มีรายการล่าสุด
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
