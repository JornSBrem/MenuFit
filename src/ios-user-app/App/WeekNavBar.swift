import SwiftUI

/// Herbruikbare weeknavigatiebalk: jaar-pijlen + scrollbare weekknoppen.
struct WeekNavBar: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    VStack(spacing: 0) {
      yearRow
        .padding(.horizontal, 20)
        .padding(.top, 12)
      weekScrollRow
        .padding(.top, 6)
      Divider()
        .padding(.top, 2)
    }
  }

  private var yearRow: some View {
    HStack {
      Button {
        viewModel.selection.year -= 1
      } label: {
        Image(systemName: "chevron.left")
          .font(.title3.weight(.semibold))
      }
      Spacer()
      Text(String(viewModel.selection.year))
        .font(.title2.bold())
      Spacer()
      Button {
        viewModel.selection.year += 1
      } label: {
        Image(systemName: "chevron.right")
          .font(.title3.weight(.semibold))
      }
    }
  }

  private var weekScrollRow: some View {
    ScrollViewReader { proxy in
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 5) {
          ForEach(1...53, id: \.self) { week in
            let selected = viewModel.selection.week == week
            Button(String(format: "%02d", week)) {
              viewModel.selection.week = week
              Task { await viewModel.loadWeekBundle() }
            }
            .font(.subheadline.monospacedDigit())
            .frame(width: 36, height: 34)
            .background(selected ? Color.orange : Color(.secondarySystemBackground))
            .foregroundColor(selected ? .white : .primary)
            .cornerRadius(7)
            .id(week)
          }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
      }
      .onAppear {
        proxy.scrollTo(viewModel.selection.week, anchor: .center)
      }
      .onChange(of: viewModel.selection.week) { week in
        withAnimation(.easeInOut(duration: 0.2)) {
          proxy.scrollTo(week, anchor: .center)
        }
      }
      .onChange(of: viewModel.selection.year) { _ in
        proxy.scrollTo(viewModel.selection.week, anchor: .center)
      }
    }
  }
}
