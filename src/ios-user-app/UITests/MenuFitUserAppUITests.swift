import XCTest

final class MenuFitUserAppUITests: XCTestCase {
  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testPrimaryTabFlowSmoke() throws {
    let app = XCUIApplication()
    app.launch()

    let tabBar = app.tabBars.firstMatch
    XCTAssertTrue(tabBar.waitForExistence(timeout: 10))

    let weekTab = tabBar.buttons["Week"]
    let matchTab = tabBar.buttons["Match"]
    let orderTab = tabBar.buttons["Bestellen"]

    XCTAssertTrue(weekTab.exists)
    XCTAssertTrue(matchTab.exists)
    XCTAssertTrue(orderTab.exists)

    weekTab.tap()
    XCTAssertTrue(app.buttons["Laad weekdata"].waitForExistence(timeout: 5))

    matchTab.tap()
    XCTAssertTrue(app.navigationBars["Match"].waitForExistence(timeout: 5))

    orderTab.tap()
    XCTAssertTrue(app.navigationBars["Bestellen"].waitForExistence(timeout: 5))
  }
}
