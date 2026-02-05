/// Test harness for autonomo_flutter
/// Run: flutter test
/// Or:  dart test test/autonomo_test.dart

import 'package:test/test.dart';
import 'package:autonomo_flutter/autonomo_flutter.dart';

void main() {
  setUp(() {
    ElementRegistry.instance.clear();
    CustomActionsRegistry.instance.clear();
  });

  group('ElementRegistry', () {
    test('registry starts empty', () {
      expect(ElementRegistry.instance.list(), isEmpty);
    });

    test('registerTapHandler adds element', () {
      var tapped = false;

      final unregister = registerTapHandler('Test.Button', () {
        tapped = true;
      });

      expect(ElementRegistry.instance.has('Test.Button'), isTrue);
      expect(ElementRegistry.instance.list(), contains('Test.Button'));

      // Invoke handler
      ElementRegistry.instance.get('Test.Button')?.handler(null);
      expect(tapped, isTrue);

      unregister();
      expect(ElementRegistry.instance.has('Test.Button'), isFalse);
    });

    test('registerFillHandler works with value', () {
      var value = '';

      final unregister = registerFillHandler(
        'Test.Input',
        (v) => value = v ?? '',
        getValue: () => value,
      );

      final handler = ElementRegistry.instance.get('Test.Input');
      handler?.handler('test value');
      expect(value, equals('test value'));
      expect(handler?.getValue?.call(), equals('test value'));

      unregister();
    });

    test('registry onChange fires on changes', () {
      var changeCount = 0;
      final unsubscribe = ElementRegistry.instance.onChange(() {
        changeCount++;
      });

      final unregister = registerTapHandler('Test.Change', () {});
      expect(changeCount, equals(1));

      unregister();
      expect(changeCount, equals(2));

      unsubscribe();
    });

    test('registry.find filters by pattern', () {
      registerTapHandler('Login.Submit', () {});
      registerTapHandler('Login.Cancel', () {});
      registerTapHandler('Home.Button', () {});

      final loginElements = ElementRegistry.instance.find(RegExp(r'^Login\.'));
      expect(loginElements.length, equals(2));

      ElementRegistry.instance.clear();
    });
  });

  group('CustomActionsRegistry', () {
    test('custom actions work', () {
      final unregister = registerCustomAction('testAction', (value) {
        if (value == 'fail') {
          return ActionResult.fail('Intentional failure');
        }
        return ActionResult.ok('Got: $value');
      });

      var result = CustomActionsRegistry.instance.execute('testAction', 'hello');
      expect(result.success, isTrue);
      expect(result.message, contains('Got: hello'));

      result = CustomActionsRegistry.instance.execute('testAction', 'fail');
      expect(result.success, isFalse);

      unregister();
    });

    test('unknown action returns error', () {
      final result = CustomActionsRegistry.instance.execute('nonexistent');
      expect(result.success, isFalse);
      expect(result.error?.toLowerCase(), contains('unknown'));
    });
  });

  group('StateManager', () {
    test('state manager tracks screen', () {
      StateManager.instance.setScreen('login');
      expect(StateManager.instance.screen, equals('login'));

      final state = StateManager.instance.getState();
      expect(state.screen, equals('login'));
    });

    test('state manager tracks user', () {
      final user = UserContext(
        id: '123',
        email: 'test@example.com',
        role: 'admin',
      );
      StateManager.instance.setUser(user);

      final state = StateManager.instance.getState();
      expect(state.user?.id, equals('123'));
      expect(state.user?.email, equals('test@example.com'));
    });

    test('state manager tracks errors', () {
      StateManager.instance.clearErrors();
      StateManager.instance.addError('Test error');

      final state = StateManager.instance.getState();
      expect(state.errors, contains('Test error'));
    });

    test('state manager merges data', () {
      StateManager.instance.setData({'key1': 'value1'});
      StateManager.instance.mergeData({'key2': 'value2'});

      final state = StateManager.instance.getState();
      expect(state.data?['key1'], equals('value1'));
      expect(state.data?['key2'], equals('value2'));
    });
  });

  group('Commands', () {
    test('commands execute press', () {
      var pressed = false;
      registerTapHandler('Cmd.Button', () => pressed = true);

      final result = executeCommand('press', target: 'Cmd.Button');
      expect(result.success, isTrue);
      expect(pressed, isTrue);

      ElementRegistry.instance.unregister('Cmd.Button');
    });

    test('commands execute fill', () {
      var value = '';
      registerFillHandler('Cmd.Input', (v) => value = v ?? '');

      final result = executeCommand('fill', target: 'Cmd.Input', value: 'hello');
      expect(result.success, isTrue);
      expect(value, equals('hello'));

      ElementRegistry.instance.unregister('Cmd.Input');
    });

    test('commands return error for missing element', () {
      final result = executeCommand('press', target: 'Nonexistent.Button');
      expect(result.success, isFalse);
      expect(result.error?.toLowerCase(), contains('not found'));
    });

    test('commands execute custom action', () {
      registerCustomAction('myAction', (value) {
        return ActionResult.ok('Executed with $value');
      });

      final result = executeCommand('custom', target: 'myAction', value: 'test');
      expect(result.success, isTrue);
    });

    test('commands handle wait', () async {
      final start = DateTime.now();
      final result = executeCommand('wait', target: '100');
      final elapsed = DateTime.now().difference(start).inMilliseconds;

      expect(result.success, isTrue);
      expect(elapsed, greaterThanOrEqualTo(100));
    });
  });
}
