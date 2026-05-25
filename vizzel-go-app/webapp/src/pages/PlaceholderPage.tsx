import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          โมดูลนี้จะพัฒนาใน Phase ถัดไป — UI และ API จะให้ใกล้เคียง Vizzel Track production
        </p>
      </CardContent>
    </Card>
  );
}
