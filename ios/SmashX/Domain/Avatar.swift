import Foundation

struct AvatarOptions: Equatable {
    var seed: String
    var backgroundColor: String
    var hair: String
    var hairColor: String
    var skinColor: String
    var eyes: String
    var mouth: String
    var eyebrows: String
    var features: String
    var glasses: String
    var earrings: String

    static let seeds = [
        "Alexander", "Jessica", "Ryan", "Sarah", "Christian", "Sofia",
        "Brian", "Amelia", "Christopher", "Felix", "Maria", "Lucas"
    ]
    static let backgrounds = ["00FF41", "3b82f6", "f472b6", "facc15", "a855f7", "ffffff", "1e293b"]
    static let hairStyles = ["short16", "short12", "short08", "short04", "short01", "long20", "long16", "long12", "long08", "long04"]
    static let hairColors = ["000000", "3b2f2f", "7a4b3a", "a67c52", "d4af37", "e5e5e5"]
    static let skinColors = ["f2d3b1", "ecad80", "9e5622", "763900", "dee1f5"]
    static let eyes = ["variant01", "variant06", "variant10", "variant16", "variant20"]
    static let mouths = ["variant01", "variant08", "variant14", "variant20", "variant26"]
    static let eyebrows = ["variant01", "variant05", "variant10", "variant15"]
    static let marks = ["none", "freckles", "blush", "mustache"]
    static let glasses = ["none", "variant01", "variant03", "variant05"]
    static let earrings = ["none", "variant01", "variant03", "variant06"]

    static func random() -> AvatarOptions {
        AvatarOptions(
            seed: seeds.randomElement() ?? "Alex",
            backgroundColor: backgrounds.randomElement() ?? "3b82f6",
            hair: hairStyles.randomElement() ?? "short16",
            hairColor: hairColors.randomElement() ?? "000000",
            skinColor: skinColors.randomElement() ?? "ecad80",
            eyes: eyes.randomElement() ?? "variant01",
            mouth: mouths.randomElement() ?? "variant01",
            eyebrows: eyebrows.randomElement() ?? "variant01",
            features: marks.randomElement() ?? "none",
            glasses: glasses.randomElement() ?? "none",
            earrings: earrings.randomElement() ?? "none"
        )
    }

    func storedURL() -> String {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "seed", value: seed),
            URLQueryItem(name: "backgroundColor", value: backgroundColor),
            URLQueryItem(name: "hairProbability", value: "100"),
            URLQueryItem(name: "hair", value: hair),
            URLQueryItem(name: "hairColor", value: hairColor),
            URLQueryItem(name: "skinColor", value: skinColor),
            URLQueryItem(name: "eyes", value: eyes),
            URLQueryItem(name: "mouth", value: mouth),
            URLQueryItem(name: "eyebrows", value: eyebrows)
        ]
        if features != "none" {
            items.append(URLQueryItem(name: "features", value: features))
            items.append(URLQueryItem(name: "featuresProbability", value: "100"))
        } else {
            items.append(URLQueryItem(name: "featuresProbability", value: "0"))
        }
        if glasses != "none" {
            items.append(URLQueryItem(name: "glasses", value: glasses))
            items.append(URLQueryItem(name: "glassesProbability", value: "100"))
        } else {
            items.append(URLQueryItem(name: "glassesProbability", value: "0"))
        }
        if earrings != "none" {
            items.append(URLQueryItem(name: "earrings", value: earrings))
            items.append(URLQueryItem(name: "earringsProbability", value: "100"))
        } else {
            items.append(URLQueryItem(name: "earringsProbability", value: "0"))
        }

        var components = URLComponents(string: "https://api.dicebear.com/9.x/adventurer/svg")
        components?.queryItems = items
        return components?.string ?? Avatar.defaultURL(seed: seed)
    }
}

enum Avatar {
    static func defaultURL(seed: String) -> String {
        "https://api.dicebear.com/9.x/adventurer/svg?seed=\(seed)"
    }

    static func displayURL(from stored: String) -> URL? {
        let png = stored
            .replacingOccurrences(of: "/adventurer/svg?", with: "/adventurer/png?")
            .replacingOccurrences(of: "/adventurer/svg&", with: "/adventurer/png&")
        return URL(string: png)
    }
}
