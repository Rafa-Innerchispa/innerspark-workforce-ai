/** Minimal valid PDF (Type1 Helvetica) for downloadable ISKCON/Judge artifacts. */
export function buildMinimalPdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const safeTitle = esc(title.slice(0, 120));
  const bodyLines = lines.slice(0, 40).map((l) => esc(l.slice(0, 110)));

  let y = 740;
  const ops: string[] = [`BT /F1 14 Tf 72 ${y} Td (${safeTitle}) Tj ET`];
  y -= 28;
  ops.push(`BT /F1 11 Tf 72 ${y} Td`);
  for (let i = 0; i < bodyLines.length; i++) {
    if (i > 0) ops.push('0 -14 Td');
    ops.push(`(${bodyLines[i]}) Tj`);
  }
  ops.push('ET');
  const stream = ops.join('\n');
  const streamLen = Buffer.byteLength(stream, 'utf8');

  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${streamLen}>>stream
${stream}
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f\x20
0000000009 00000 n\x20
0000000058 00000 n\x20
0000000115 00000 n\x20
0000000244 00000 n\x20
0000000${(300 + streamLen).toString().padStart(3, '0')} 00000 n\x20
trailer<</Size 6/Root 1 0 R>>
startxref
${320 + streamLen}
%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
