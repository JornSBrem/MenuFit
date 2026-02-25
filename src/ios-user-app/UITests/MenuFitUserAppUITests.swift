import XCTest

final class MenuFitUserAppUITests: XCTestCase {
  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testPrimaryTabFlowSmoke() throws {
    let app = XCUIApplication()
    app.launch()
    authenticateIfNeeded(app: app)

    let tabBar = app.tabBars.firstMatch
    XCTAssertTrue(tabBar.waitForExistence(timeout: 10))
    SnapshotAssert.assertElementSnapshot(named: "tabbar-week", element: tabBar, maxDiffRatio: 0.02)

    let weekTab = tabBar.buttons["Week"]
    let matchTab = tabBar.buttons["Match"]
    let orderTab = tabBar.buttons["Bestellen"]

    XCTAssertTrue(weekTab.exists)
    XCTAssertTrue(matchTab.exists)
    XCTAssertTrue(orderTab.exists)

    weekTab.tap()
    XCTAssertTrue(app.navigationBars["Week"].waitForExistence(timeout: 5))
    SnapshotAssert.assertElementSnapshot(named: "week-screen", element: app.navigationBars["Week"])

    matchTab.tap()
    XCTAssertTrue(app.navigationBars["Match"].waitForExistence(timeout: 5))
    SnapshotAssert.assertElementSnapshot(named: "match-screen", element: app.navigationBars["Match"])

    orderTab.tap()
    XCTAssertTrue(app.navigationBars["Bestellen"].waitForExistence(timeout: 5))
    SnapshotAssert.assertElementSnapshot(named: "order-screen", element: app.navigationBars["Bestellen"])
  }

  private func authenticateIfNeeded(app: XCUIApplication) {
    let submitButton = app.buttons["onboarding-submit-button"]
    guard submitButton.waitForExistence(timeout: 2) else {
      return
    }

    let tokenField = app.secureTextFields["onboarding-token-field"]
    XCTAssertTrue(tokenField.waitForExistence(timeout: 2))
    tokenField.tap()
    tokenField.typeText("uitest-access-token")

    let subjectField = app.textFields["onboarding-subject-field"]
    if subjectField.waitForExistence(timeout: 1) {
      subjectField.tap()
      subjectField.typeText("uitest-user")
    }

    let picnicField = app.textFields["onboarding-picnic-field"]
    if picnicField.waitForExistence(timeout: 1) {
      picnicField.tap()
      picnicField.typeText("uitest-picnic")
    }

    let householdField = app.textFields["onboarding-household-field"]
    if householdField.waitForExistence(timeout: 1) {
      householdField.tap()
      householdField.typeText("uitest-household")
    }

    submitButton.tap()
    XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 10))
  }
}
