import Foundation
import Supabase

enum SmashXClient {
    static let shared: SupabaseClient = {
        guard
            let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
            let url = URL(string: urlString),
            !key.isEmpty
        else {
            fatalError("Missing SUPABASE_URL or SUPABASE_ANON_KEY in Info.plist")
        }
        return SupabaseClient(supabaseURL: url, supabaseKey: key)
    }()
}
