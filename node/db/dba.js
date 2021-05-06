module.exports = function( main ){
	const { Sequelize, DataTypes, Model } = require('sequelize');
	let options = main.get_options();
	let connectionUri;

	switch( options.db.driver ){
		case "sqlite":
			connectionUri = options.db.driver + ':' + options.db.database;
			break;
		case "mysql":
		case "postgres":
		case "mariadb":
		case "mssql":
			connectionUri = options.db.driver + '://';
			if( options.db.username ){
				connectionUri += options.db.username;
				if( options.db.password ){
					connectionUri += ':' + options.db.password;
				}
				connectionUri += '@';
			}
			connectionUri += options.db.host;
			if( options.db.port ){
				connectionUri += ':' + options.db.port;
			}
			connectionUri += '/' + options.db.database;
			break;
	}


	// データベース接続の初期化
	console.log('Connect to database...', connectionUri);
	const sequelize = new Sequelize(connectionUri, {
		logging: (...msg) => {
			// console.log(msg)
		},
	});


	// --------------------------------------
	// Models: Crawling Url
	class CrawlingUrl extends Model {}
	CrawlingUrl.init({
		// 使用者識別情報
		"user_id": {
			type: DataTypes.STRING,
		},
		"project_id": {
			type: DataTypes.STRING,
		},

		// URLスキーマ
		// 例: http, https
		"scheme": {
			type: DataTypes.STRING,
			allowNull: false
		},

		// ホスト名
		// ポート番号が指定される場合はそれも含む
		// 例: example.com
		// 例: example.com:3000
		// 例: user:passwd@example.com:3000
		"host": {
			type: DataTypes.STRING,
			allowNull: false
		},

		// ポート番号
		// 例: 80
		// 例: 443
		"port": {
			type: DataTypes.INTEGER,
			allowNull: false
		},

		// パス名
		// Getパラメータがある場合はそれも含む
		// 例: /foobar.html
		// 例: /foobar.html?a=b&c=d
		"path": {
			type: DataTypes.STRING,
			allowNull: false
		},

		// リクエストメソッド
		"request_method": {
			type: DataTypes.STRING,
		},

		// リクエストヘッダ
		"request_headers": {
			type: DataTypes.STRING,
		},

		// リクエストボディ
		"request_body": {
			type: DataTypes.TEXT,
		},

		// 状態
		// - null = 未取得
		// - progress = 実行中
		// - done = 実行済み
		"status": {
			type: DataTypes.STRING,
		},

		// 実行結果
		// - null = 未取得
		// - ok = 完了
		// - errored = エラーが発生
		// - ignored = 対象範囲外
		"result": {
			type: DataTypes.STRING,
		},

		// エラーメッセージ
		"error_message": {
			type: DataTypes.STRING,
		},

		// リクエスト日時
		"request_datetime": {
			type: DataTypes.DATE,
		},

		// レスポンスヘッダ
		"response_headers": {
			type: DataTypes.STRING,
		},

		// レスポンスステータスコード
		"response_status": {
			type: DataTypes.INTEGER,
		},

		// レスポンスボディ(base64)
		"response_body_base64": {
			type: DataTypes.TEXT,
		},

		// レスポンスサイズ
		"response_body_size": {
			type: DataTypes.INTEGER,
		},

		// レスポンスタイム (sec)
		"response_time": {
			type: DataTypes.FLOAT,
		},
	}, {
		sequelize,
		modelName: 'CrawlingUrl',
	});
	CrawlingUrl.sync({
		alter: true,
	});
	this.CrawlingUrl = CrawlingUrl;


	/**
	 * クロール対象URLに関する情報を取得する
	 */
	this.get_url_info = async function(scheme, host, path, method){
		let result = await CrawlingUrl.findAll({
			where: {
				scheme: scheme,
				host: host,
				path: path,
				request_method: method,
			}
		});
		// console.log('---------result:', result);
		if( result && result[0] ){
			return result[0];
		}
		return false;
	}

	/**
	 * クロール対象の新しいURLを挿入する
	 */
	this.insert_new_url = async function(scheme, host, path, method, req_headers, req_body){
		let record = await this.get_url_info(scheme, host, path, method);
		if( record ){
			return record.id;
		}

		let port = 80;
		if( host.match(/\:([0-9]*)$/) ){
			port = RegExp.$1;
		}else if( scheme == 'http' ){
			port = 80;
		}else if( scheme == 'https' ){
			port = 443;
		}

		let newRecord = await CrawlingUrl.create({
			"user_id": options.user_id,
			"project_id": options.project_id,
			"scheme": scheme,
			"host": host,
			"port": port,
			"path": path,
			"request_method": method,
			"request_headers": JSON.stringify(req_headers),
			"request_body": req_body,
		});
		// console.log('=-=-=-=-=-= inserted:', newRecord.id);
		return newRecord.id;
	}

}
