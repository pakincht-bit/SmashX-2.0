import SwiftUI
import UIKit

enum SXColor {
    static let base = Color(red: 0, green: 11 / 255, blue: 41 / 255)
    static let structure = Color(red: 0, green: 16 / 255, blue: 48 / 255)
    static let card = Color(red: 0, green: 22 / 255, blue: 69 / 255)
    static let border = Color(red: 0, green: 34 / 255, blue: 102 / 255)
    static let neon = Color(red: 0, green: 1, blue: 65 / 255)
    static let banner = Color(red: 26 / 255, green: 28 / 255, blue: 35 / 255)
    static let panel = Color(red: 24 / 255, green: 24 / 255, blue: 27 / 255)
    static let muted = Color(white: 0.55)
    static let navyInk = Color(red: 0, green: 11 / 255, blue: 41 / 255)
}

enum SXFont {
    static func title(_ size: CGFloat = 20) -> Font {
        .system(size: size, weight: .black, design: .default).italic()
    }

    static func label(_ size: CGFloat = 10) -> Font {
        .system(size: size, weight: .black, design: .default)
    }

    static func body(_ size: CGFloat = 14) -> Font {
        .system(size: size, weight: .bold, design: .default)
    }

    static func numeric(_ size: CGFloat = 16) -> Font {
        .system(size: size, weight: .black, design: .default).monospacedDigit()
    }
}

enum SmashXAppearance {
    static func apply() {
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = UIColor(SXColor.base)
        nav.shadowColor = UIColor(SXColor.border)
        nav.titleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: UIFont.systemFont(ofSize: 17, weight: .black)
        ]
        nav.largeTitleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: UIFont.systemFont(ofSize: 32, weight: .black)
        ]
        let bar = UINavigationBar.appearance()
        bar.standardAppearance = nav
        bar.scrollEdgeAppearance = nav
        bar.compactAppearance = nav
        bar.tintColor = UIColor(SXColor.neon)
        bar.barStyle = .black

        UITextField.appearance().keyboardAppearance = .dark
        UIDatePicker.appearance().overrideUserInterfaceStyle = .dark
    }
}

struct ArenaScreen<Content: View>: View {
    var content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .foregroundStyle(.white)
            .background(SXColor.base.ignoresSafeArea())
            .toolbarBackground(SXColor.base, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

struct SXSectionTitle: View {
    var text: String
    var accent: String? = nil
    var size: CGFloat = 20

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(text)
                .font(SXFont.title(size))
                .textCase(.uppercase)
                .tracking(-0.8)
            if let accent {
                Text(accent)
                    .font(SXFont.title(size))
                    .textCase(.uppercase)
                    .tracking(-0.8)
                    .foregroundStyle(SXColor.neon)
            }
            Spacer()
        }
    }
}

struct SXChip: View {
    var text: String
    var color: Color = SXColor.neon

    var body: some View {
        Text(text)
            .font(SXFont.label(8))
            .textCase(.uppercase)
            .tracking(1.6)
            .foregroundStyle(color == SXColor.neon ? SXColor.navyInk : .white)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(color)
    }
}

extension View {
    func arenaBackground() -> some View {
        foregroundStyle(.white)
            .background(SXColor.base.ignoresSafeArea())
            .toolbarBackground(SXColor.base, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

enum SXDate {
    static func parts(_ iso: String) -> (month: String, day: String, weekday: String) {
        guard let date = ISO.date(from: iso) else { return ("", "", "") }
        let month = date.formatted(.dateTime.month(.abbreviated)).uppercased()
        let day = date.formatted(.dateTime.day())
        let weekday = date.formatted(.dateTime.weekday(.abbreviated)).uppercased()
        return (month, day, weekday)
    }

    static func time(_ iso: String) -> String {
        guard let date = ISO.date(from: iso) else { return "" }
        return date.formatted(.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits))
    }

    static func range(_ start: String, _ end: String) -> String {
        "\(time(start)) – \(time(end))"
    }
}

extension AppTab {
    var arenaLabel: String {
        switch self {
        case .sessions: return "Arena"
        case .leaderboard: return "Ranks"
        case .groups: return "Groups"
        case .add: return "Add"
        }
    }
}
