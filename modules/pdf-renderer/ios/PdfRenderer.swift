import PDFKit
import ExpoModulesCore

public class PdfRendererModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PdfRenderer")

    AsyncFunction("getPageCount") { (filePath: String) -> Int in
      let url = URL(string: filePath) ?? URL(fileURLWithPath: filePath)
      guard let document = PDFDocument(url: url) else {
        throw NSError(domain: "PdfRenderer", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Cannot open PDF: \(filePath)"])
      }
      return document.pageCount
    }

    AsyncFunction("renderPage") { (filePath: String, pageIndex: Int, scale: Double) -> String in
      let url = URL(string: filePath) ?? URL(fileURLWithPath: filePath)
      guard let document = PDFDocument(url: url),
            let page = document.page(at: pageIndex) else {
        throw NSError(domain: "PdfRenderer", code: 2,
          userInfo: [NSLocalizedDescriptionKey: "Cannot load page \(pageIndex)"])
      }

      let bounds = page.bounds(for: .mediaBox)
      let s = CGFloat(scale)
      let width = Int(bounds.width * s)
      let height = Int(bounds.height * s)

      let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height))
      let image = renderer.image { ctx in
        UIColor.white.setFill()
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
        ctx.cgContext.translateBy(x: 0, y: CGFloat(height))
        ctx.cgContext.scaleBy(x: s, y: -s)
        page.draw(with: .mediaBox, to: ctx.cgContext)
      }

      let tempDir = FileManager.default.temporaryDirectory
      let outPath = tempDir.appendingPathComponent("pdf_page_\(pageIndex)_\(Int(Date().timeIntervalSince1970)).jpg")
      guard let data = image.jpegData(compressionQuality: 0.9) else {
        throw NSError(domain: "PdfRenderer", code: 3,
          userInfo: [NSLocalizedDescriptionKey: "Cannot encode image"])
      }
      try data.write(to: outPath)
      return outPath.absoluteString
    }
  }
}
