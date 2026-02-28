import SwiftUI

// MARK: - MenuFit Design System

/// Centrale kleuren, typografie en herbruikbare componenten voor de hele app.
enum MFColors {
  // Brand
  static let accent = Color.orange
  static let accentGradientStart = Color(red: 1.0, green: 0.55, blue: 0.0)
  static let accentGradientEnd = Color(red: 1.0, green: 0.35, blue: 0.1)
  static let brandGradient = LinearGradient(
    colors: [accentGradientStart, accentGradientEnd],
    startPoint: .topLeading, endPoint: .bottomTrailing
  )

  // Semantic
  static let success = Color.green
  static let warning = Color.orange
  static let error = Color.red
  static let info = Color.blue

  // Surface
  static let cardBackground = Color(.secondarySystemBackground)
  static let elevatedBackground = Color(.tertiarySystemBackground)
  static let sheetBackground = Color(.systemBackground)

  // Meal moments
  static func mealMomentColor(_ label: String) -> Color {
    switch label {
    case "Ontbijt":               return .yellow
    case "Tussendoor (ochtend)":  return .brown
    case "Lunch":                 return .orange
    case "Tussendoor (middag)":   return .green
    case "Diner":                 return .indigo
    case "Snack":                 return .purple
    default:                      return .orange
    }
  }

  static func mealMomentIcon(_ label: String) -> String {
    switch label {
    case "Ontbijt":               return "sunrise.fill"
    case "Tussendoor (ochtend)":  return "cup.and.saucer.fill"
    case "Lunch":                 return "sun.max.fill"
    case "Tussendoor (middag)":   return "leaf.fill"
    case "Diner":                 return "moon.stars.fill"
    case "Snack":                 return "star.fill"
    default:                      return "fork.knife"
    }
  }
}

// MARK: - Reusable Card Modifier

struct MFCardStyle: ViewModifier {
  var padding: CGFloat = 16
  var cornerRadius: CGFloat = 16

  func body(content: Content) -> some View {
    content
      .padding(padding)
      .background(MFColors.cardBackground)
      .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
      .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
  }
}

extension View {
  func mfCard(padding: CGFloat = 16, cornerRadius: CGFloat = 16) -> some View {
    modifier(MFCardStyle(padding: padding, cornerRadius: cornerRadius))
  }
}

// MARK: - Pill Tag

struct MFPill: View {
  let text: String
  var icon: String? = nil
  var color: Color = MFColors.accent

  var body: some View {
    HStack(spacing: 4) {
      if let icon {
        Image(systemName: icon)
          .font(.caption2.bold())
      }
      Text(text)
        .font(.caption.bold())
    }
    .foregroundColor(color)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(color.opacity(0.12))
    .clipShape(Capsule())
  }
}

// MARK: - Section Header

struct MFSectionHeader: View {
  let title: String
  var icon: String? = nil

  var body: some View {
    HStack(spacing: 6) {
      if let icon {
        Image(systemName: icon)
          .font(.subheadline.bold())
          .foregroundColor(MFColors.accent)
      }
      Text(title)
        .font(.title3.bold())
    }
    .padding(.horizontal, 20)
    .padding(.top, 20)
    .padding(.bottom, 4)
  }
}

// MARK: - Async Meal/Recipe Image

struct MFAsyncImage: View {
  let urlString: String?
  var width: CGFloat = 130
  var height: CGFloat = 90
  var cornerRadius: CGFloat = 12

  var body: some View {
    Group {
      if let urlString, let url = URL(string: urlString) {
        AsyncImage(url: url) { phase in
          switch phase {
          case .success(let image):
            image.resizable().scaledToFill()
          default:
            placeholder
          }
        }
      } else {
        placeholder
      }
    }
    .frame(width: width, height: height)
    .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
  }

  private var placeholder: some View {
    ZStack {
      MFColors.cardBackground
      Image(systemName: "fork.knife")
        .font(.title2)
        .foregroundStyle(.tertiary)
    }
  }
}

// MARK: - Kcal Badge

struct MFKcalBadge: View {
  let kcal: Int

  var body: some View {
    MFPill(text: "\(kcal) kcal", icon: "flame.fill", color: MFColors.accent)
  }
}

// MARK: - Empty State

struct MFEmptyState: View {
  let icon: String
  let title: String
  var subtitle: String? = nil

  var body: some View {
    VStack(spacing: 14) {
      Image(systemName: icon)
        .font(.system(size: 52))
        .foregroundStyle(.tertiary)
      Text(title)
        .font(.headline)
        .foregroundColor(.secondary)
      if let subtitle {
        Text(subtitle)
          .font(.subheadline)
          .foregroundColor(.tertiary)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 40)
      }
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 60)
  }
}

// MARK: - Primary Button Style

struct MFPrimaryButtonStyle: ButtonStyle {
  var color: Color = MFColors.accent

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.headline)
      .foregroundColor(.white)
      .frame(maxWidth: .infinity)
      .padding(.vertical, 14)
      .background(
        RoundedRectangle(cornerRadius: 14, style: .continuous)
          .fill(color)
          .opacity(configuration.isPressed ? 0.8 : 1.0)
      )
  }
}

extension ButtonStyle where Self == MFPrimaryButtonStyle {
  static var mfPrimary: MFPrimaryButtonStyle { MFPrimaryButtonStyle() }
  static func mfPrimary(color: Color) -> MFPrimaryButtonStyle { MFPrimaryButtonStyle(color: color) }
}

// MARK: - Meal Moment Icon (Circle)

struct MFMealIcon: View {
  let mealLabel: String
  var size: CGFloat = 40

  private var color: Color { MFColors.mealMomentColor(mealLabel) }
  private var icon: String { MFColors.mealMomentIcon(mealLabel) }

  var body: some View {
    Circle()
      .fill(color.opacity(0.15))
      .frame(width: size, height: size)
      .overlay {
        Image(systemName: icon)
          .foregroundColor(color)
          .font(.system(size: size * 0.38))
      }
  }
}

// MARK: - Animated Gradient Header

struct MFGradientHeader: View {
  let title: String
  var subtitle: String? = nil

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(title)
        .font(.largeTitle.bold())
        .foregroundStyle(MFColors.brandGradient)
      if let subtitle {
        Text(subtitle)
          .font(.subheadline)
          .foregroundColor(.secondary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 20)
    .padding(.top, 16)
    .padding(.bottom, 8)
  }
}

// MARK: - Shimmer Loading Placeholder

struct MFShimmer: View {
  @State private var phase: CGFloat = 0

  var body: some View {
    RoundedRectangle(cornerRadius: 8)
      .fill(Color(.systemGray5))
      .overlay(
        RoundedRectangle(cornerRadius: 8)
          .fill(
            LinearGradient(
              colors: [.clear, .white.opacity(0.4), .clear],
              startPoint: .leading,
              endPoint: .trailing
            )
          )
          .offset(x: phase)
      )
      .clipShape(RoundedRectangle(cornerRadius: 8))
      .onAppear {
        withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
          phase = 300
        }
      }
  }
}
