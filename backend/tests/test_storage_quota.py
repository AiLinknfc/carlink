from app.services.storage_quota import FREE_QUOTA, KEYCHAIN_QUOTA, KIT_QUOTA, MB, quota_for


def test_quota_tiers():
    assert quota_for("persona", 0) == FREE_QUOTA == 100 * MB
    assert quota_for("persona", 1) == KEYCHAIN_QUOTA == 200 * MB
    assert quota_for("persona", 2) == KEYCHAIN_QUOTA
    assert quota_for("persona", 3) == KIT_QUOTA == 500 * MB


def test_business_accounts_have_no_cap():
    assert quota_for("taller", 0) is None
