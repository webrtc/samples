# Copyright 2014 Google Inc. All Rights Reserved.

import unittest

import util

class UtilTest(unittest.TestCase):
  def testGetMessageFromJson(self):
    self.assertEqual(None, util.get_message_from_json(""))
    self.assertEqual({}, util.get_message_from_json("{}"))
    self.assertEqual(
        {"a": "b","c": False, "d": 1, "e" : [1,2,"3"]}, 
        util.get_message_from_json('{"a":"b","c":false,"d":1,"e":[1,2,"3"]}'))
    
  def testHasMsgField(self):
    testObject = {
      "a": False,
      "b": "str",
      "c": None,
      "d": {},
      "e": [1, 2, "3"],
      "f": [],
      "g": {'A': 1}
    }
    self.assertEqual(
        True,
        util.has_msg_field(testObject, "a", bool))
    self.assertEqual(
        False,
        util.has_msg_field(testObject, "a", basestring))
    self.assertEqual(
        False,
        util.has_msg_field(testObject, "c", bool))
    self.assertEqual(
        False,
        util.has_msg_field(testObject, "d", dict))
    self.assertEqual(
        True,
        util.has_msg_field(testObject, "e", list))
    self.assertEqual(
        False,
        util.has_msg_field(testObject, "f", list))
    self.assertEqual(
        True,
        util.has_msg_field(testObject, "g", dict))
    self.assertEqual(
        False,
        util.has_msg_field(testObject, "h", dict))
    self.assertEqual(
        False,
        util.has_msg_field(None, "a", dict))

  def testHasMsgFields(self):
    testObject = {
      "a": False,
      "b": "str",
      "c": None,
      "d": {},
      "e": [1, 2, "3"],
      "f": [],
      "g": {'A': 1}
    }
    self.assertEqual(
        True,
        util.has_msg_fields(
            testObject, 
            (("a", bool), ("b", basestring), ("e", list))))
    self.assertEqual(
        False,
        util.has_msg_fields(
            testObject, 
            (("a", bool), ("b", bool), ("e", list))))
    self.assertEqual(
        False,
        util.has_msg_fields(
            testObject, 
            (("a", bool), ("h", basestring), ("e", list))))

  def testGenerateRandomGeneratesStringOfRightLength(self):
    self.assertEqual(17, len(util.generate_random(17)))
    self.assertEqual(23, len(util.generate_random(23)))

if __name__ == '__main__':
  unittest.main()
