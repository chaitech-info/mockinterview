/**
 * Client-only: rasterize a DOM subtree and save as a multi-page A4 PDF.
 */
export async function downloadReportPdfFromElement(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (_doc, cloned) => {
      const root = cloned.querySelector("[data-report-pdf-root]");
      if (!root) return;
      root.querySelectorAll("table").forEach((t) => {
        const table = t as HTMLTableElement;
        table.style.tableLayout = "fixed";
        table.style.width = "100%";
        table.style.minWidth = "0";
      });
      root.querySelectorAll("tbody td:last-child").forEach((cell) => {
        const el = cell as HTMLElement;
        el.style.verticalAlign = "top";
        el.style.overflowWrap = "break-word";
        el.style.wordBreak = "break-word";
        el.style.hyphens = "auto";
      });
    },
  });

  const imgData = canvas.toDataURL("image/png", 1);
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgProps = pdf.getImageProperties(imgData);
  const imgHeightMm = (imgProps.height * contentWidth) / imgProps.width;

  let heightLeft = imgHeightMm;
  pdf.addImage(imgData, "PNG", margin, margin, contentWidth, imgHeightMm);
  heightLeft -= contentHeight;

  while (heightLeft > 0) {
    const y = margin - (imgHeightMm - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, y, contentWidth, imgHeightMm);
    heightLeft -= contentHeight;
  }

  pdf.save(fileName);
}
