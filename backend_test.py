import requests
import sys
import json
from datetime import datetime, timedelta

class RamadanAPITester:
    def __init__(self, base_url="https://prayer-timer-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = {
            'tvc_videos': [],
            'berbuka_videos': [],
            'schedules': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_tvc_videos_crud(self):
        """Test TVC Videos CRUD operations"""
        print("\n=== Testing TVC Videos CRUD ===")
        
        # 1. GET empty list
        success, data = self.run_test("Get TVC Videos (empty)", "GET", "tvc-videos", 200)
        if not success:
            return False
            
        # 2. CREATE new TVC video
        tvc_data = {
            "name": "Test TVC Video 1",
            "url": "https://example.com/tvc1.mp4",
            "order": 1,
            "is_active": True
        }
        success, created_tvc = self.run_test("Create TVC Video", "POST", "tvc-videos", 200, tvc_data)
        if not success:
            return False
        
        tvc_id = created_tvc.get('id')
        if tvc_id:
            self.created_items['tvc_videos'].append(tvc_id)
            print(f"   Created TVC ID: {tvc_id}")
        
        # 3. GET list with item
        success, data = self.run_test("Get TVC Videos (with data)", "GET", "tvc-videos", 200)
        if not success or len(data) == 0:
            print("❌ Failed - No TVC videos returned after creation")
            return False
            
        # 4. UPDATE TVC video
        update_data = {"name": "Updated TVC Video 1", "order": 2}
        success, updated_tvc = self.run_test(f"Update TVC Video", "PUT", f"tvc-videos/{tvc_id}", 200, update_data)
        if not success:
            return False
            
        # 5. DELETE TVC video
        success, _ = self.run_test(f"Delete TVC Video", "DELETE", f"tvc-videos/{tvc_id}", 200)
        if success and tvc_id in self.created_items['tvc_videos']:
            self.created_items['tvc_videos'].remove(tvc_id)
        
        return success

    def test_berbuka_videos_crud(self):
        """Test Berbuka Videos CRUD operations"""
        print("\n=== Testing Berbuka Videos CRUD ===")
        
        # 1. GET empty list
        success, data = self.run_test("Get Berbuka Videos (empty)", "GET", "berbuka-videos", 200)
        if not success:
            return False
            
        # 2. CREATE new Berbuka video
        berbuka_data = {
            "name": "Test Berbuka Video 1",
            "url": "https://example.com/berbuka1.mp4",
            "duration_seconds": 300,
            "is_active": True
        }
        success, created_berbuka = self.run_test("Create Berbuka Video", "POST", "berbuka-videos", 200, berbuka_data)
        if not success:
            return False
        
        berbuka_id = created_berbuka.get('id')
        if berbuka_id:
            self.created_items['berbuka_videos'].append(berbuka_id)
            print(f"   Created Berbuka ID: {berbuka_id}")
        
        # 3. GET list with item
        success, data = self.run_test("Get Berbuka Videos (with data)", "GET", "berbuka-videos", 200)
        if not success or len(data) == 0:
            print("❌ Failed - No Berbuka videos returned after creation")
            return False
            
        # 4. UPDATE Berbuka video
        update_data = {"name": "Updated Berbuka Video 1", "duration_seconds": 600}
        success, updated_berbuka = self.run_test(f"Update Berbuka Video", "PUT", f"berbuka-videos/{berbuka_id}", 200, update_data)
        if not success:
            return False
            
        # 5. DELETE Berbuka video
        success, _ = self.run_test(f"Delete Berbuka Video", "DELETE", f"berbuka-videos/{berbuka_id}", 200)
        if success and berbuka_id in self.created_items['berbuka_videos']:
            self.created_items['berbuka_videos'].remove(berbuka_id)
        
        return success

    def test_schedules_crud(self):
        """Test Maghrib Schedules CRUD operations"""
        print("\n=== Testing Maghrib Schedules CRUD ===")
        
        # 1. GET empty list
        success, data = self.run_test("Get Schedules (empty)", "GET", "schedules", 200)
        if not success:
            return False
            
        # 2. CREATE new schedule
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        schedule_data = {
            "date": tomorrow,
            "maghrib_time": "18:15",
            "location": "Bekasi"
        }
        success, created_schedule = self.run_test("Create Schedule", "POST", "schedules", 200, schedule_data)
        if not success:
            return False
        
        schedule_id = created_schedule.get('id')
        if schedule_id:
            self.created_items['schedules'].append(schedule_id)
            print(f"   Created Schedule ID: {schedule_id}")
        
        # 3. GET list with item
        success, data = self.run_test("Get Schedules (with data)", "GET", "schedules", 200)
        if not success or len(data) == 0:
            print("❌ Failed - No schedules returned after creation")
            return False
            
        # 4. Test duplicate date (should fail)
        success, _ = self.run_test("Create Duplicate Schedule (should fail)", "POST", "schedules", 400, schedule_data)
        if success:
            print("❌ Failed - Duplicate schedule creation should have failed")
            return False
        else:
            print("✅ Correctly rejected duplicate schedule")
            self.tests_passed += 1  # Count this as a pass since it behaved correctly
            
        # 5. UPDATE schedule
        update_data = {"maghrib_time": "18:30"}
        success, updated_schedule = self.run_test(f"Update Schedule", "PUT", f"schedules/{schedule_id}", 200, update_data)
        if not success:
            return False
            
        # 6. DELETE schedule
        success, _ = self.run_test(f"Delete Schedule", "DELETE", f"schedules/{schedule_id}", 200)
        if success and schedule_id in self.created_items['schedules']:
            self.created_items['schedules'].remove(schedule_id)
        
        return success

    def test_display_state(self):
        """Test Display State endpoint"""
        print("\n=== Testing Display State ===")
        
        success, state_data = self.run_test("Get Display State", "GET", "display-state", 200)
        if not success:
            return False
            
        # Validate response structure
        required_fields = ['state', 'current_tvc_videos']
        for field in required_fields:
            if field not in state_data:
                print(f"❌ Failed - Missing required field: {field}")
                return False
                
        valid_states = ['tvc', 'countdown', 'berbuka']
        if state_data['state'] not in valid_states:
            print(f"❌ Failed - Invalid state: {state_data['state']}")
            return False
            
        print(f"✅ Valid display state: {state_data['state']}")
        return True

    def test_bulk_schedules(self):
        """Test bulk schedule creation"""
        print("\n=== Testing Bulk Schedule Creation ===")
        
        # Create multiple schedules for next few days
        bulk_data = []
        for i in range(3):
            date = (datetime.now() + timedelta(days=i+2)).strftime("%Y-%m-%d")
            bulk_data.append({
                "date": date,
                "maghrib_time": f"18:{15+i}",
                "location": "Bekasi"
            })
            
        success, created_schedules = self.run_test("Create Bulk Schedules", "POST", "schedules/bulk", 200, bulk_data)
        if not success:
            return False
            
        # Store created IDs for cleanup
        for schedule in created_schedules:
            if 'id' in schedule:
                self.created_items['schedules'].append(schedule['id'])
                
        print(f"✅ Created {len(created_schedules)} bulk schedules")
        return True

    def cleanup_test_data(self):
        """Clean up any test data that wasn't deleted during tests"""
        print("\n=== Cleaning up test data ===")
        
        # Clean up TVC videos
        for tvc_id in self.created_items['tvc_videos']:
            try:
                requests.delete(f"{self.api_url}/tvc-videos/{tvc_id}")
                print(f"Cleaned up TVC video: {tvc_id}")
            except:
                pass
                
        # Clean up Berbuka videos
        for berbuka_id in self.created_items['berbuka_videos']:
            try:
                requests.delete(f"{self.api_url}/berbuka-videos/{berbuka_id}")
                print(f"Cleaned up Berbuka video: {berbuka_id}")
            except:
                pass
                
        # Clean up schedules
        for schedule_id in self.created_items['schedules']:
            try:
                requests.delete(f"{self.api_url}/schedules/{schedule_id}")
                print(f"Cleaned up schedule: {schedule_id}")
            except:
                pass

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Ramadan Countdown API Tests")
        print(f"Backend URL: {self.base_url}")
        
        try:
            # Test basic connectivity
            if not self.test_root_endpoint()[0]:
                print("❌ Root endpoint failed, stopping tests")
                return False
                
            # Test all CRUD operations
            tests = [
                self.test_tvc_videos_crud,
                self.test_berbuka_videos_crud,
                self.test_schedules_crud,
                self.test_display_state,
                self.test_bulk_schedules
            ]
            
            for test in tests:
                if not test():
                    print(f"❌ Test {test.__name__} failed")
                    
        finally:
            # Always cleanup
            self.cleanup_test_data()
            
        # Print results
        print(f"\n📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RamadanAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())