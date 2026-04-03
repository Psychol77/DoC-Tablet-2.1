#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class DOCSystemTester:
    def __init__(self, base_url="https://officer-command-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_credentials = {
            "email": "admin@doc.gov",
            "password": "Admin123!"
        }
        self.test_user_id = None
        self.test_asset_id = None
        self.test_assignment_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        return success

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request and return response"""
        url = f"{self.base_url}/api/{endpoint}"
        
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)
            
            success = response.status_code == expected_status
            return success, response
        except Exception as e:
            return False, str(e)

    def test_auth_login(self):
        """Test admin login"""
        success, response = self.make_request('POST', 'auth/login', self.admin_credentials)
        if success:
            try:
                data = response.json()
                if data.get('role') == 'founder' and data.get('email') == 'admin@doc.gov':
                    return self.log_test("Admin Login", True)
                else:
                    return self.log_test("Admin Login", False, "Invalid response data")
            except:
                return self.log_test("Admin Login", False, "Invalid JSON response")
        else:
            return self.log_test("Admin Login", False, f"Status: {response.status_code}")

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.make_request('GET', 'auth/me')
        if success:
            try:
                data = response.json()
                if data.get('role') == 'founder':
                    return self.log_test("Get Current User", True)
                else:
                    return self.log_test("Get Current User", False, "Invalid user data")
            except:
                return self.log_test("Get Current User", False, "Invalid JSON response")
        else:
            return self.log_test("Get Current User", False, f"Status: {response.status_code}")

    def test_stats(self):
        """Test dashboard stats"""
        success, response = self.make_request('GET', 'stats')
        if success:
            try:
                data = response.json()
                required_keys = ['usersCount', 'assetsCount', 'assignmentsCount', 'availableAssets']
                if all(key in data for key in required_keys):
                    return self.log_test("Dashboard Stats", True)
                else:
                    return self.log_test("Dashboard Stats", False, "Missing required stats")
            except:
                return self.log_test("Dashboard Stats", False, "Invalid JSON response")
        else:
            return self.log_test("Dashboard Stats", False, f"Status: {response.status_code}")

    def test_get_users(self):
        """Test getting users list"""
        success, response = self.make_request('GET', 'users')
        if success:
            try:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    admin_found = any(user.get('email') == 'admin@doc.gov' for user in data)
                    if admin_found:
                        return self.log_test("Get Users List", True)
                    else:
                        return self.log_test("Get Users List", False, "Admin user not found")
                else:
                    return self.log_test("Get Users List", False, "Empty or invalid users list")
            except:
                return self.log_test("Get Users List", False, "Invalid JSON response")
        else:
            return self.log_test("Get Users List", False, f"Status: {response.status_code}")

    def test_create_user(self):
        """Test creating a new user"""
        test_user = {
            "email": f"test.user.{datetime.now().strftime('%H%M%S')}@doc.gov",
            "password": "TestPass123!",
            "firstName": "Test",
            "lastName": "User",
            "badgeNumber": f"TEST{datetime.now().strftime('%H%M%S')}",
            "position": "PO I",
            "role": "employee"
        }
        
        success, response = self.make_request('POST', 'users', test_user, 200)
        if success:
            try:
                data = response.json()
                self.test_user_id = data.get('id')
                if self.test_user_id and data.get('email') == test_user['email']:
                    return self.log_test("Create User", True)
                else:
                    return self.log_test("Create User", False, "Invalid response data")
            except:
                return self.log_test("Create User", False, "Invalid JSON response")
        else:
            return self.log_test("Create User", False, f"Status: {response.status_code}")

    def test_get_user(self):
        """Test getting specific user"""
        if not self.test_user_id:
            return self.log_test("Get Specific User", False, "No test user ID available")
        
        success, response = self.make_request('GET', f'users/{self.test_user_id}')
        if success:
            try:
                data = response.json()
                if data.get('id') == self.test_user_id:
                    return self.log_test("Get Specific User", True)
                else:
                    return self.log_test("Get Specific User", False, "User ID mismatch")
            except:
                return self.log_test("Get Specific User", False, "Invalid JSON response")
        else:
            return self.log_test("Get Specific User", False, f"Status: {response.status_code}")

    def test_update_user_profile(self):
        """Test updating user profile"""
        if not self.test_user_id:
            return self.log_test("Update User Profile", False, "No test user ID available")
        
        profile_update = {
            "meritBars": ["Bravery", "Service", "", "", "", ""],
            "trainings": {
                "OPP": True,
                "KPP": False,
                "Strzelanie": True,
                "Taktyka": False,
                "Prawo": True,
                "PierwszaPomoc": False
            },
            "notes": "Test notes for profile update",
            "promotionDate": "2024-01-15T00:00:00.000Z"
        }
        
        success, response = self.make_request('PUT', f'users/{self.test_user_id}', profile_update)
        if success:
            try:
                data = response.json()
                if data.get('notes') == profile_update['notes']:
                    return self.log_test("Update User Profile", True)
                else:
                    return self.log_test("Update User Profile", False, "Profile not updated correctly")
            except:
                return self.log_test("Update User Profile", False, "Invalid JSON response")
        else:
            return self.log_test("Update User Profile", False, f"Status: {response.status_code}")

    def test_create_asset(self):
        """Test creating a new asset"""
        test_asset = {
            "name": f"Test Equipment {datetime.now().strftime('%H%M%S')}",
            "serialNumber": f"SN-TEST-{datetime.now().strftime('%H%M%S')}",
            "category": "Elektronika",
            "status": "Dostępny"
        }
        
        success, response = self.make_request('POST', 'assets', test_asset, 200)
        if success:
            try:
                data = response.json()
                self.test_asset_id = data.get('id')
                if self.test_asset_id and data.get('name') == test_asset['name']:
                    return self.log_test("Create Asset", True)
                else:
                    return self.log_test("Create Asset", False, "Invalid response data")
            except:
                return self.log_test("Create Asset", False, "Invalid JSON response")
        else:
            return self.log_test("Create Asset", False, f"Status: {response.status_code}")

    def test_get_assets(self):
        """Test getting assets list"""
        success, response = self.make_request('GET', 'assets')
        if success:
            try:
                data = response.json()
                if isinstance(data, list):
                    return self.log_test("Get Assets List", True)
                else:
                    return self.log_test("Get Assets List", False, "Invalid assets list")
            except:
                return self.log_test("Get Assets List", False, "Invalid JSON response")
        else:
            return self.log_test("Get Assets List", False, f"Status: {response.status_code}")

    def test_update_asset(self):
        """Test updating asset"""
        if not self.test_asset_id:
            return self.log_test("Update Asset", False, "No test asset ID available")
        
        asset_update = {
            "name": f"Updated Test Equipment {datetime.now().strftime('%H%M%S')}",
            "serialNumber": f"SN-UPD-{datetime.now().strftime('%H%M%S')}",
            "category": "Wyposażenie",
            "status": "W użyciu"
        }
        
        success, response = self.make_request('PUT', f'assets/{self.test_asset_id}', asset_update)
        if success:
            try:
                data = response.json()
                if data.get('name') == asset_update['name']:
                    return self.log_test("Update Asset", True)
                else:
                    return self.log_test("Update Asset", False, "Asset not updated correctly")
            except:
                return self.log_test("Update Asset", False, "Invalid JSON response")
        else:
            return self.log_test("Update Asset", False, f"Status: {response.status_code}")

    def test_create_assignment(self):
        """Test creating asset assignment"""
        if not self.test_asset_id or not self.test_user_id:
            return self.log_test("Create Assignment", False, "Missing asset or user ID")
        
        assignment_data = {
            "assetId": self.test_asset_id,
            "userId": self.test_user_id
        }
        
        success, response = self.make_request('POST', 'assignments', assignment_data, 200)
        if success:
            try:
                data = response.json()
                self.test_assignment_id = data.get('id')
                if self.test_assignment_id:
                    return self.log_test("Create Assignment", True)
                else:
                    return self.log_test("Create Assignment", False, "No assignment ID returned")
            except:
                return self.log_test("Create Assignment", False, "Invalid JSON response")
        else:
            return self.log_test("Create Assignment", False, f"Status: {response.status_code}")

    def test_get_assignments(self):
        """Test getting assignments list"""
        success, response = self.make_request('GET', 'assignments')
        if success:
            try:
                data = response.json()
                if isinstance(data, list):
                    return self.log_test("Get Assignments List", True)
                else:
                    return self.log_test("Get Assignments List", False, "Invalid assignments list")
            except:
                return self.log_test("Get Assignments List", False, "Invalid JSON response")
        else:
            return self.log_test("Get Assignments List", False, f"Status: {response.status_code}")

    def test_get_user_assignments(self):
        """Test getting user-specific assignments"""
        if not self.test_user_id:
            return self.log_test("Get User Assignments", False, "No test user ID available")
        
        success, response = self.make_request('GET', f'assignments/user/{self.test_user_id}')
        if success:
            try:
                data = response.json()
                if isinstance(data, list):
                    return self.log_test("Get User Assignments", True)
                else:
                    return self.log_test("Get User Assignments", False, "Invalid assignments list")
            except:
                return self.log_test("Get User Assignments", False, "Invalid JSON response")
        else:
            return self.log_test("Get User Assignments", False, f"Status: {response.status_code}")

    def test_get_audit_logs(self):
        """Test getting audit logs"""
        success, response = self.make_request('GET', 'audit-logs')
        if success:
            try:
                data = response.json()
                if isinstance(data, list):
                    return self.log_test("Get Audit Logs", True)
                else:
                    return self.log_test("Get Audit Logs", False, "Invalid audit logs list")
            except:
                return self.log_test("Get Audit Logs", False, "Invalid JSON response")
        else:
            return self.log_test("Get Audit Logs", False, f"Status: {response.status_code}")

    def test_cascade_delete_asset(self):
        """Test cascade delete of asset (should remove assignments)"""
        if not self.test_asset_id:
            return self.log_test("Cascade Delete Asset", False, "No test asset ID available")
        
        success, response = self.make_request('DELETE', f'assets/{self.test_asset_id}')
        if success:
            try:
                data = response.json()
                if "wraz z przypisaniami" in data.get('message', ''):
                    return self.log_test("Cascade Delete Asset", True)
                else:
                    return self.log_test("Cascade Delete Asset", False, "Unexpected response message")
            except:
                return self.log_test("Cascade Delete Asset", False, "Invalid JSON response")
        else:
            return self.log_test("Cascade Delete Asset", False, f"Status: {response.status_code}")

    def test_delete_user(self):
        """Test deleting user"""
        if not self.test_user_id:
            return self.log_test("Delete User", False, "No test user ID available")
        
        success, response = self.make_request('DELETE', f'users/{self.test_user_id}')
        if success:
            try:
                data = response.json()
                if "usunięty" in data.get('message', ''):
                    return self.log_test("Delete User", True)
                else:
                    return self.log_test("Delete User", False, "Unexpected response message")
            except:
                return self.log_test("Delete User", False, "Invalid JSON response")
        else:
            return self.log_test("Delete User", False, f"Status: {response.status_code}")

    def test_auth_logout(self):
        """Test logout"""
        success, response = self.make_request('POST', 'auth/logout')
        if success:
            try:
                data = response.json()
                if "wylogowano" in data.get('message', '').lower():
                    return self.log_test("Logout", True)
                else:
                    return self.log_test("Logout", False, "Unexpected response message")
            except:
                return self.log_test("Logout", False, "Invalid JSON response")
        else:
            return self.log_test("Logout", False, f"Status: {response.status_code}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🔍 Starting Department of Corrections ERP Backend Tests")
        print("=" * 60)
        
        # Authentication tests
        print("\n📋 Authentication Tests:")
        if not self.test_auth_login():
            print("❌ Login failed - stopping tests")
            return False
        
        self.test_auth_me()
        
        # Core functionality tests
        print("\n📋 Dashboard & Stats Tests:")
        self.test_stats()
        
        print("\n📋 User Management Tests:")
        self.test_get_users()
        self.test_create_user()
        self.test_get_user()
        self.test_update_user_profile()
        
        print("\n📋 Asset Management Tests:")
        self.test_create_asset()
        self.test_get_assets()
        self.test_update_asset()
        
        print("\n📋 Assignment Tests:")
        self.test_create_assignment()
        self.test_get_assignments()
        self.test_get_user_assignments()
        
        print("\n📋 Audit & Logging Tests:")
        self.test_get_audit_logs()
        
        print("\n📋 Cascade Delete Tests:")
        self.test_cascade_delete_asset()
        self.test_delete_user()
        
        print("\n📋 Logout Test:")
        self.test_auth_logout()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = DOCSystemTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())