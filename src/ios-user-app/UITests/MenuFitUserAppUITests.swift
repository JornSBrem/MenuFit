import XCTest

final class MenuFitUserAppUITests: XCTestCase {
  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testMockedCoreFlowRendersDeterministicData() throws {
    let app = launchApp(scenario: "success")
    let tabBar = assertTabBar(app)

    tabBar.buttons["Week"].tap()
    let loadButton = app.buttons["Laad weekdata"]
    XCTAssertTrue(loadButton.waitForExistence(timeout: 5))
    loadButton.tap()
    XCTAssertTrue(findStaticText(app, containing: "Weekplan ID: mock-weekplan-9", maxSwipes: 4).exists)
    XCTAssertTrue(findStaticText(app, containing: "Paprika", maxSwipes: 2).exists)
    XCTAssertTrue(findStaticText(app, containing: "Tomaat", maxSwipes: 2).exists)

    tabBar.buttons["Match"].tap()
    XCTAssertTrue(app.navigationBars["Match"].waitForExistence(timeout: 5))
    XCTAssertTrue(findStaticText(app, containing: "Tomaat", maxSwipes: 2).exists)

    let evaluateButton = app.buttons["Evalueer eerste unresolved item"]
    XCTAssertTrue(evaluateButton.waitForExistence(timeout: 5))
    evaluateButton.tap()
    XCTAssertTrue(findStaticText(app, containing: "Top candidate: tomaat-roma", maxSwipes: 2).exists)

    tabBar.buttons["Bestellen"].tap()
    XCTAssertTrue(app.navigationBars["Bestellen"].waitForExistence(timeout: 5))
    let syncButton = app.buttons["Sync naar Picnic (online)"]
    XCTAssertTrue(syncButton.waitForExistence(timeout: 5))
    syncButton.tap()
    XCTAssertTrue(app.staticTexts["Report ID: mock-sync-1"].waitForExistence(timeout: 10))
  }

  func testMockedWeekFailureShowsUserVisibleError() throws {
    let app = launchApp(scenario: "week_failure")
    let tabBar = assertTabBar(app)

    tabBar.buttons["Week"].tap()
    let loadButton = app.buttons["Laad weekdata"]
    XCTAssertTrue(loadButton.waitForExistence(timeout: 5))
    loadButton.tap()
    let genericError = findStaticText(app, containing: "Kon weekdata niet online of uit offline cache laden.", maxSwipes: 2)
    let offlineFallback = findStaticText(app, containing: "Offline data geladen:", maxSwipes: 2)
    XCTAssertTrue(genericError.exists || offlineFallback.exists)
  }

  @discardableResult
  private func assertTabBar(_ app: XCUIApplication) -> XCUIElement {
    let tabBar = app.tabBars.firstMatch
    XCTAssertTrue(tabBar.waitForExistence(timeout: 10))
    XCTAssertTrue(tabBar.buttons["Week"].exists)
    XCTAssertTrue(tabBar.buttons["Match"].exists)
    XCTAssertTrue(tabBar.buttons["Bestellen"].exists)
    return tabBar
  }

  private func launchApp(scenario: String) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchEnvironment["MENUFIT_UI_TEST_SCENARIO"] = scenario
    app.launchEnvironment["MenuFitBackendBaseURL"] = "https://mock.local"
    app.launchEnvironment["MenuFitUserAccessToken"] = "ui-test-token"
    app.launchEnvironment["MenuFitUserSubjectId"] = "ui-test-user"
    app.launchEnvironment["MenuFitPicnicAccountId"] = "ui-test-picnic"
    app.launchEnvironment["MenuFitHouseholdId"] = "ui-test-household"
    app.launchEnvironment["MenuFitUserTokenExpiryEpochSeconds"] = "4102444800"
    app.launch()
    return app
  }

  private func findStaticText(_ app: XCUIApplication, containing value: String, maxSwipes: Int) -> XCUIElement {
    let predicate = NSPredicate(format: "label CONTAINS %@", value)
    let element = app.staticTexts.containing(predicate).firstMatch
    var swipesLeft = maxSwipes
    while !element.exists && swipesLeft > 0 {
      app.swipeUp()
      swipesLeft -= 1
    }
    return element
  }
}
