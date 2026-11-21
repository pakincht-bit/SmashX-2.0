# SmashX iOS

Native SwiftUI client for the existing SmashX Supabase backend. Lives next to the web PWA in this repo.

## Requirements

- Xcode 16 or later (not Command Line Tools only)
- iOS 17+ simulator or device
- The same Supabase project the web app uses

This Mac currently has Command Line Tools only, so the project was not compiled here. Install Xcode from the App Store, then open the project.

## Open the project

```bash
open ios/SmashX.xcodeproj
```

On first open, Xcode will resolve the [supabase-swift](https://github.com/supabase/supabase-swift) package. Select your development team under Signing if you want to run on a device. Then pick an iPhone simulator and Run.

Credentials come from `Config/Secrets.xcconfig` (anon key only — already public in the web client).

## Layout

```
ios/SmashX/
  App/           App entry, root store
  Domain/        Models, ELO, mappers
  Services/      Supabase, auth, realtime, haptics
  Features/      SwiftUI screens (system TabView / List / Form)
```
