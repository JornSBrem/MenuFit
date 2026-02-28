import SwiftUI

/// Herbruikbare weeknavigatiebalk: compact jaar + scrollbare weeiknoppen met today-indicator.
struct WeekNavBar: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  private var currentCalendarWeek: Int {
    Calendar.current.component(.weekOfYear, from: Date())
  }

  var body: some View {
    VStack(spacing: 0) {
      yearRow
        .padding(.horizontal, 20)
        .padding(.top, 12)
      weekScrollRow
        .padding(.top, 8)
    }
  }

  private var yearRow: some View {
    HStack {
      Button {
        withAnimation(.snappy) { viewModel.selection.year -= 1 }
      } label: {
        Image(systemName: "chevron.left.circle.fill")
          .font(.title3)
          .foregroundStyle(MFColors.accent)
      }
      Spacer()
      Text(String(viewModel.selection.year))
        .font(.title3.bold())
        .contentTransition(.numericText())
      Spacer()
      Button {
        withAnimation(.snappy) { viewModel.selection.year += 1 }
      } label: {
        Image(systemName: "chevron.right.circle.fill")
          .font(.title3)
          .foregroundStyle(MFColors.accent)
      }
    }
  }

  private var weekScrollRow: some View {
    ScrollViewReader { proxy in
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 6) {
          ForEach(1...53, id: \.self) { week in
            let selected = viewModel.selection.week == week
            let isCurrentWeek = week == currentCalendarWeek
              && viewModel.selection.year == Calendar.current.component(.yearForWeekOfYear, from: Date())

            Button {
              withAnimation(.snappy) { viewModel.selection.week = week }
              Task { await viewModel.loadWeekBundle() }
            } label: {
              VStack(spacing: 2) {
                Text(String(format: "%02d", week))
                  .font(.subheadline.monospacedDigit().bold())
                if isCurrentWeek {
                  Circle()
                    .fill(selected ? .white : MFColors.accent)
                    .frame(width: 5, height: 5)
                }
              }
              .frame(width: 40, height: 42)
              .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                  .fill(selected ? MFColors.accent : Color(.secondarySystemBackground))
              )
              .foregroundColor(selected ? .white : .primary)
            }
            .buttonStyle(.plain)
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

