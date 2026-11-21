import Foundation
import Supabase

@MainActor
final class RealtimeService {
    var onSessionInsert: ((Session) -> Void)?
    var onSessionUpdate: ((Session) -> Void)?
    var onSessionDelete: ((String) -> Void)?
    var onProfileUpdate: ((Player) -> Void)?
    var onStatus: ((String) -> Void)?

    private var channel: RealtimeChannelV2?
    private var subscriptions: [RealtimeSubscription] = []
    private let decoder = JSONDecoder()

    func start() async {
        await stop()
        let channel = SmashXClient.shared.channel("public:all-changes")

        subscriptions.append(
            channel.onPostgresChange(AnyAction.self, schema: "public", table: "sessions") { [weak self] action in
                Task { @MainActor in
                    self?.handleSession(action)
                }
            }
        )

        subscriptions.append(
            channel.onPostgresChange(UpdateAction.self, schema: "public", table: "profiles") { [weak self] action in
                Task { @MainActor in
                    self?.handleProfile(action)
                }
            }
        )

        await channel.subscribe()
        self.channel = channel
        onStatus?("SUBSCRIBED")
    }

    func stop() async {
        subscriptions.removeAll()
        if let channel {
            await channel.unsubscribe()
        }
        channel = nil
    }

    private func handleSession(_ action: AnyAction) {
        switch action {
        case .insert(let insert):
            if let session = decode(insert.record, as: SessionRow.self).map(Mappers.session) {
                onSessionInsert?(session)
            }
        case .update(let update):
            if let session = decode(update.record, as: SessionRow.self).map(Mappers.session) {
                onSessionUpdate?(session)
            }
        case .delete(let delete):
            if case .string(let id) = delete.oldRecord["id"] {
                onSessionDelete?(id)
            }
        @unknown default:
            break
        }
    }

    private func handleProfile(_ action: UpdateAction) {
        if let player = decode(action.record, as: ProfileRow.self).map(Mappers.player) {
            onProfileUpdate?(player)
        }
    }

    private func decode<T: Decodable>(_ record: [String: AnyJSON], as type: T.Type) -> T? {
        (try? JSONEncoder().encode(record)).flatMap { try? decoder.decode(T.self, from: $0) }
    }
}
