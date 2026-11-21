import SwiftUI

struct AvatarImage: View {
    let urlString: String
    var size: CGFloat = 36

    var body: some View {
        AsyncImage(url: Avatar.displayURL(from: urlString)) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                Circle().fill(Color.secondary.opacity(0.2))
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}
