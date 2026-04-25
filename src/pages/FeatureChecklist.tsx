import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, ListChecks, Cpu, Shield } from 'lucide-react';
import { FEATURE_CHECKLIST, getTotalFeatureCount } from '@/lib/feature-checklist-data';

const STORAGE_KEY = 'ocrp-feature-checklist-checked';

function loadChecked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecked(map: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function keyOf(catId: string, idx: number) {
  return `${catId}::${idx}`;
}

export default function FeatureChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(loadChecked);
  const total = useMemo(getTotalFeatureCount, []);
  const completedCount = Object.values(checked).filter(Boolean).length;

  const toggle = (k: string) => {
    const next = { ...checked, [k]: !checked[k] };
    setChecked(next);
    saveChecked(next);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 54;
    const marginTop = 64;
    const marginBottom = 54;
    const contentWidth = pageWidth - marginX * 2;
    let y = marginTop;

    const ensureRoom = (needed: number) => {
      if (y + needed > pageHeight - marginBottom) {
        doc.addPage();
        y = marginTop;
      }
    };

    // Cover header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('O.C.R.P. Feature Checklist', marginX, y);
    y += 26;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    doc.text(
      `Generated ${dateStr}  ·  ${completedCount} of ${total} marked complete`,
      marginX,
      y,
    );
    y += 22;

    // Divider
    doc.setDrawColor(200);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 18;
    doc.setTextColor(0);

    FEATURE_CHECKLIST.forEach((cat) => {
      ensureRoom(60);

      // Category title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(cat.title, marginX, y);
      y += 16;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(110);
      const descLines = doc.splitTextToSize(cat.description, contentWidth);
      doc.text(descLines, marginX, y);
      y += descLines.length * 12 + 6;
      doc.setTextColor(0);

      // Features
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      cat.features.forEach((f, i) => {
        const isChecked = !!checked[keyOf(cat.id, i)];
        const box = isChecked ? '[x]' : '[ ]';
        const text = `${box}  ${f}`;
        const lines = doc.splitTextToSize(text, contentWidth - 8);
        ensureRoom(lines.length * 14 + 2);
        doc.text(lines, marginX + 8, y);
        y += lines.length * 14 + 2;
      });

      y += 12;
    });

    // Footer page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text(
        `O.C.R.P. — Feature Checklist  ·  Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 28,
        { align: 'center' },
      );
    }

    doc.save(`ocrp-feature-checklist-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ListChecks className="w-7 h-7 text-primary" />
            Feature Checklist
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            The complete inventory of everything built into O.C.R.P. Tick boxes to track
            your audit, then export the whole list — including check states — as a PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {completedCount} / {total} marked
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/architecture" className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Architecture
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          </Button>
          <Button onClick={handleExportPdf} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)] pr-2">
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURE_CHECKLIST.map((cat) => {
            const catChecked = cat.features.filter((_, i) => checked[keyOf(cat.id, i)]).length;
            return (
              <Card key={cat.id} className="bg-card-gradient border-border">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{cat.title}</CardTitle>
                      <CardDescription>{cat.description}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {catChecked}/{cat.features.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {cat.features.map((f, i) => {
                      const k = keyOf(cat.id, i);
                      const isChecked = !!checked[k];
                      return (
                        <li key={k} className="flex items-start gap-2">
                          <Checkbox
                            id={k}
                            checked={isChecked}
                            onCheckedChange={() => toggle(k)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={k}
                            className={`text-sm leading-snug cursor-pointer ${
                              isChecked ? 'text-muted-foreground line-through' : ''
                            }`}
                          >
                            {f}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
