// Local annotation aid only; OCR output is never reviewed ground truth.
import Foundation
import Vision
import ImageIO

let args = CommandLine.arguments
guard args.count == 3 else { fatalError("Usage: ph-ocr manifest.jsonl output-directory") }
let rows = try String(contentsOfFile: args[1], encoding: .utf8).split(separator: "\n")
let output = URL(fileURLWithPath: args[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
for line in rows {
    try autoreleasepool {
        let row = try JSONSerialization.jsonObject(with: Data(line.utf8)) as! [String: Any]
        let id = row["id"] as! String
        let target = output.appendingPathComponent(id + ".json")
        if FileManager.default.fileExists(atPath: target.path) { return }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["en-US"]
        request.usesLanguageCorrection = false
        var result: [String: Any] = ["id": id, "engine": "Apple Vision", "revision": request.revision,
            "status": "draft", "os": ProcessInfo.processInfo.operatingSystemVersionString]
        do {
            try VNImageRequestHandler(url: URL(fileURLWithPath: row["image"] as! String)).perform([request])
            result["lines"] = (request.results ?? []).compactMap { observation -> [String: Any]? in
                guard let text = observation.topCandidates(1).first else { return nil }
                let b = observation.boundingBox
                return ["text": text.string, "confidence": text.confidence,
                    "box": [b.minX, b.minY, b.width, b.height]]
            }
        } catch { result["error"] = String(describing: error); result["lines"] = [] }
        try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys]).write(to: target)
        print(id)
    }
}
