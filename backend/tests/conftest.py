"""
conftest.py — pytest shared fixtures.
"""
import sys
import os
import pytest

# Add the backend directory to sys.path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
