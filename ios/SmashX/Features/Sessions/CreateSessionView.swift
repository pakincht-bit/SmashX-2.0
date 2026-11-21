import SwiftUI

struct CreateSessionView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let editing: Session?

    @State private var draft: CreateSessionDraft
    @State private var error: String?
    @State private var isSaving = false

    init(editing: Session?) {
        self.editing = editing
        _draft = State(initialValue: editing.map(CreateSessionDraft.from) ?? .blank())
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    SXField(title: "Title", text: $draft.title, placeholder: "Session title")
                    SXField(title: "Location", text: $draft.location, placeholder: "Court location")

                    Text("When")
                        .font(SXFont.label(10))
                        .textCase(.uppercase)
                        .tracking(1.8)
                        .foregroundStyle(SXColor.neon)
                    DatePicker("Start", selection: $draft.start)
                        .tint(SXColor.neon)
                        .padding(12)
                        .background(SXColor.card)
                    DatePicker("End", selection: $draft.end)
                        .tint(SXColor.neon)
                        .padding(12)
                        .background(SXColor.card)


                    if let error {
                        Text(error)
                            .font(SXFont.label(10))
                            .foregroundStyle(.red)
                    }

                    SXButton(
                        title: isSaving ? "Saving…" : "Save",
                        isLoading: isSaving,
                        enabled: !draft.location.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(24)
            }
            .arenaBackground()
            .navigationTitle(editing == nil ? "New Session" : "Edit Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(SXColor.muted)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func save() async {
        isSaving = true
        if let message = await store.saveSession(draft, editing: editing) {
            error = message
            isSaving = false
        } else {
            dismiss()
        }
    }
}
