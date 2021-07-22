# coding=utf-8
"""SCALE UI: feature tests."""

import time
from function import (
    wait_on_element,
    is_element_present,
    attribute_value_exist,
    run_cmd,
    post
)
from pytest_bdd import (
    given,
    scenario,
    then,
    when,
    parsers
)


@scenario('features/NAS-T1133.feature', 'Create a wheel group smb share and verify only wheel group can send file')
def test_create_a_wheel_group_smb_share_and_verify_only_wheel_group_can_send_file():
    """Create a wheel group smb share and verify only wheel group can send file."""


@given('the browser is open, the FreeNAS URL and logged in')
def the_browser_is_open_the_freenas_url_and_logged_in(driver, nas_ip, root_password):
    """the browser is open, the FreeNAS URL and logged in."""
    if nas_ip not in driver.current_url:
        driver.get(f"http://{nas_ip}")
        assert wait_on_element(driver, 10, '//input[@data-placeholder="Username"]')
    if not is_element_present(driver, '//mat-list-item[@ix-auto="option__Dashboard"]'):
        assert wait_on_element(driver, 10, '//input[@data-placeholder="Username"]')
        driver.find_element_by_xpath('//input[@data-placeholder="Username"]').clear()
        driver.find_element_by_xpath('//input[@data-placeholder="Username"]').send_keys('root')
        driver.find_element_by_xpath('//input[@data-placeholder="Password"]').clear()
        driver.find_element_by_xpath('//input[@data-placeholder="Password"]').send_keys(root_password)
        assert wait_on_element(driver, 5, '//button[@name="signin_button"]')
        driver.find_element_by_xpath('//button[@name="signin_button"]').click()
    else:
        driver.find_element_by_xpath('//mat-list-item[@ix-auto="option__Dashboard"]').click()


@when('you should be on the dashboard, click on Sharing then Windows Shares(SMB)')
def you_should_be_on_the_dashboard_click_on_sharing_then_windows_sharessmb(driver):
    """you should be on the dashboard, click on Sharing then Windows Shares(SMB)."""
    time.sleep(1)
    assert wait_on_element(driver, 10, '//span[contains(.,"Dashboard")]')
    assert wait_on_element(driver, 10, '//mat-list-item[@ix-auto="option__Dashboard"]', 'clickable')
    driver.find_element_by_xpath('//mat-list-item[@ix-auto="option__Dashboard"]').click()
    time.sleep(1)
    driver.find_element_by_xpath('//mat-list-item[@ix-auto="option__Shares"]').click()


@then('The Windows Shares(SMB) page should open, Click Add')
def the_windows_sharessmb_page_should_open_click_add(driver):
    """The Windows Shares(SMB) page should open, Click Add."""
    assert wait_on_element(driver, 5, '//div[contains(.,"Windows (SMB) Shares")]')
    time.sleep(1)
    assert wait_on_element(driver, 5, '//mat-card[contains(.,"SMB")]//button[contains(.,"Add")]')
    driver.find_element_by_xpath('//mat-card[contains(.,"SMB")]//button[contains(.,"Add")]').click()
    assert wait_on_element(driver, 5, '//h3[contains(.,"Add SMB")]')  


@then(parsers.parse('Set Path to the LDAP dataset "{path}", Input "{smbname}" as name, Click to enable, Input "{description}" as description, and Click Summit'))
def set_path_to_the_ldap_dataset_mnttankwheel_dataset_input_wheelsmbshare_as_name_click_to_enable_input_test_wheel_smb_share_as_description_and_click_summit(driver, path, smbname, description):
    """Set Path to the LDAP dataset {path}, Input {smbname} as name, Click to enable, Input {description} as description, and Click Summit."""
    time.sleep(1)
    global smb_path
    """Set Path to the ACL dataset "/mnt/dozer/my_acl_dataset"."""
    assert wait_on_element(driver, 5, '//input[@ix-auto="input__path"]')
    driver.find_element_by_xpath('//input[@ix-auto="input__path"]').clear()
    driver.find_element_by_xpath('//input[@ix-auto="input__path"]').send_keys(path)
    time.sleep(1)

    assert wait_on_element(driver, 5, '//input[@ix-auto="input__Name"]')
    driver.find_element_by_xpath('//input[@ix-auto="input__Name"]').clear()
    driver.find_element_by_xpath('//input[@ix-auto="input__Name"]').send_keys(smbname)
    checkbox_checked = attribute_value_exist(driver, '//mat-checkbox[@ix-auto="checkbox__Enabled"]', 'class', 'mat-checkbox-checked')
    if not checkbox_checked:
        driver.find_element_by_xpath('//mat-checkbox[@ix-auto="checkbox__Enabled"]').click()
    assert attribute_value_exist(driver, '//mat-checkbox[@ix-auto="checkbox__Enabled"]', 'class', 'mat-checkbox-checked')
    time.sleep(1)

    assert wait_on_element(driver, 5, '//input[@ix-auto="input__Description"]')
    driver.find_element_by_xpath('//input[@ix-auto="input__Description"]').clear()
    driver.find_element_by_xpath('//input[@ix-auto="input__Description"]').send_keys(description)
    time.sleep(1)

    assert wait_on_element(driver, 5, '//button[@ix-auto="button__SAVE"]')
    driver.find_element_by_xpath('//button[@ix-auto="button__SAVE"]').click()
    time.sleep(4)
    assert wait_on_element(driver, 10, '//h1[contains(.,"Enable Service")]')
    assert wait_on_element(driver, 7, '//button[@ix-auto="button__ENABLE SERVICE"]', 'clickable')
    driver.find_element_by_xpath('//button[@ix-auto="button__ENABLE SERVICE"]').click()



@then(parsers.parse('"{smbname}" should be added, Click on service and the Service page should open'))
def test_wheel_smb_share_should_be_added_click_on_service_and_the_service_page_should_open(driver, smbname):
    """"{smbname}" should be added, Click on service and the Service page should open."""
    time.sleep(1)
    assert wait_on_element(driver, 5, '//div[contains(.,"Windows (SMB) Shares")]')
    driver.find_element_by_xpath('//a[contains("Windows (SMB) Shares")]').click()
    time.sleep(1)
    assert wait_on_element(driver, 5, '//div[contains(.,"Samba")]')
    assert wait_on_element(driver, 5, f'//div[contains(.,"{smbname}")]')
    time.sleep(1)
    driver.find_element_by_xpath('//mat-list-item[@ix-auto="option__Services"]').click()
    time.sleep(1)
    assert wait_on_element(driver, 5, '//services')


@then('If the SMB serivce is not started start the service, and click on SMB Start Automatically checkbox')
def if_the_smb_serivce_is_not_started_start_the_service_and_click_on_smb_start_automatically_checkbox(driver):
    """If the SMB serivce is not started start the service, and click on SMB Start Automatically checkbox."""
    time.sleep(1)
    assert wait_on_element(driver, 5, '//services')
    assert wait_on_element(driver, 5, '//button[@ix-auto="button__S3_Actions"]')
    # Scroll to SMB service
    element = driver.find_element_by_xpath('//button[@ix-auto="button__S3_Actions"]')
    driver.execute_script("arguments[0].scrollIntoView();", element)
    time.sleep(1)
    driver.find_element_by_xpath('//div[@ix-auto="value__SMB"]')
    value_exist = attribute_value_exist(driver, '//mat-slide-toggle[@ix-auto="slider__SMB_Running"]', 'class', 'mat-checked')
    if not value_exist:
        driver.find_element_by_xpath('//div[@ix-auto="overlay__SMB_Running"]').click()
    time.sleep(2)
    value_exist = attribute_value_exist(driver, '//mat-checkbox[@ix-auto="checkbox__SMB_Start Automatically"]', 'class', 'mat-checkbox-checked')
    if not value_exist:
        driver.find_element_by_xpath('//mat-checkbox[@ix-auto="checkbox__SMB_Start Automatically"]').click()


@then(parsers.parse('Send a file to the share with nas_IP/{smbname} and {user} and {password}'))
def send_a_file_to_the_share_with_nas_ipwheelsmbshare_and_ericbsd_and_testing(driver, nas_ip, my_acl_dataset, user, password):
    """Send a file to the share with nas_IP/"{smbname}" and "{user}" and "{password}"."""
    run_cmd('touch testfile.txt')
    results = run_cmd(f'smbclient //{nas_ip}/{smbname} -W AD01 -U {user}%{password} -c "put testfile.txt testfile.txt"')
    time.sleep(1)
    run_cmd('rm testfile.txt')
    assert results['result'], results['output']


@then('Verify that the is on nas_ip with root and password')
def verify_that_the_is_on_nas_ip_with_root_and_password(driver, root_password):
    """Verify that the is on nas_ip with root and password."""
    results = post(nas_url, 'filesystem/stat/', ("root", root_password), f'{smb_path}/testfile.txt')
    assert results.status_code == 200, results.text


@then(parsers.parse('send a file to the share should fail with NAS IP/{smbname} and {user}%{password}'))
def send_a_file_to_the_share_should_fail_with_nas_ipwheelsmbshare_and_footesting(driver, smb_name, user, password):
    """send a file to the share should fail with NAS IP/"{smbname}" and {user}%{password}."""
    run_cmd('touch testfile2.txt')
    results = run_cmd(f'smbclient //{nas_ip}/{smbname} -W AD01 -U {user}%{password} -c "put testfile2.txt testfile2.txt"')
    time.sleep(1)
    run_cmd('rm testfile2.txt')
    assert results['result'], results['output']


@then('verify that the file is not on the NAS')
def verify_that_the_file_is_not_on_the_nas(driver, root_password):
    """verify that the file is not on the NAS."""
    results = post(nas_url, 'filesystem/stat/', ("root", root_password), f'{smb_path}/testfile2.txt')
    assert results.status_code == 200, results.text is False


    ## return to dashboard
    assert wait_on_element(driver, 10, '//mat-list-item[@ix-auto="option__Dashboard"]', 'clickable')
    driver.find_element_by_xpath('//mat-list-item[@ix-auto="option__Dashboard"]').click()
    time.sleep(1)
