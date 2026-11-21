import SwiftUI

struct SXField: View {
    var title: String
    @Binding var text: String
    var isSecure: Bool = false
    var placeholder: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(SXFont.label(10))
                .textCase(.uppercase)
                .tracking(1.8)
                .foregroundStyle(SXColor.neon)
            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .font(SXFont.body(16))
            .foregroundStyle(.white)
            .padding(16)
            .background(SXColor.card)
            .overlay(Rectangle().stroke(SXColor.border, lineWidth: 1))
            .shadow(color: .clear, radius: 0)
        }
    }
}

struct SXStepperRow: View {
    var title: String
    @Binding var value: Int
    var range: ClosedRange<Int>

    var body: some View {
        HStack {
            Text(title)
                .font(SXFont.label(10))
                .textCase(.uppercase)
                .tracking(1.8)
                .foregroundStyle(SXColor.muted)
            Spacer()
            Button {
                value = max(range.lowerBound, value - 1)
            } label: {
                Image(systemName: "minus")
                    .frame(width: 36, height: 36)
                    .background(SXColor.card)
            }
            Text("\(value)")
                .font(SXFont.numeric(20).italic())
                .frame(minWidth: 28)
            Button {
                value = min(range.upperBound, value + 1)
            } label: {
                Image(systemName: "plus")
                    .frame(width: 36, height: 36)
                    .background(SXColor.card)
            }
        }
        .foregroundStyle(.white)
    }
}
